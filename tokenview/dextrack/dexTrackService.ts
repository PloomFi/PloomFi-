import { Connection, PublicKey, ParsedTransactionWithMeta, LogsCallback, Logs, Commitment } from "@solana/web3.js"
import { EventEmitter } from "events"
import { z } from "zod"

/** Configuration schema for DexTrackService */
const dexTrackConfigSchema = z.object({
  endpoint: z.string().url(),
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
  /** one or more DEX program ids to subscribe to */
  programIds: z
    .array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 program id"))
    .min(1, "at least one program id is required"),
})

export type DexTrackConfig = z.infer<typeof dexTrackConfigSchema>

/** Parameters for tracking a trading pair */
const trackParamsSchema = z.object({
  inputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
  outputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
  /** minimum input amount (ui units) required to emit swap */
  minInputAmount: z.number().nonnegative().optional(),
  /** minimum output amount (ui units) required to emit swap */
  minOutputAmount: z.number().nonnegative().optional(),
})

export type TrackParams = z.infer<typeof trackParamsSchema>

/** Represents a single swap event on-chain */
export interface SwapEvent {
  signature: string
  slot: number
  timestamp: number
  inputMint: string
  outputMint: string
  inputAmount: number
  outputAmount: number
  programId: string
}

/** Internal cache for mint decimals */
type MintDecimalsCache = Map<string, number>

/**
 * DexTrackService listens for swap events on specified DEX program ids
 * It parses transactions to emit normalized SwapEvent for a concrete mint pair
 */
export class DexTrackService extends EventEmitter {
  private connection: Connection
  private commitment: Commitment
  private readonly programIds: PublicKey[]
  private subscriptions: number[] = []
  private trackingParams: TrackParams | null = null
  private processedSignatures = new Set<string>()
  private decimalsCache: MintDecimalsCache = new Map()
  private running = false

  constructor(rawConfig: unknown) {
    super()
    const { endpoint, commitment, programIds } = dexTrackConfigSchema.parse(rawConfig)
    this.connection = new Connection(endpoint, commitment)
    this.commitment = commitment
    this.programIds = programIds.map((p) => new PublicKey(p))
  }

  /** Begin subscription for a mint pair */
  public async subscribe(rawParams: unknown): Promise<void> {
    const params = trackParamsSchema.parse(rawParams)
    this.trackingParams = params
    if (this.running) await this.unsubscribeAll()
    this.running = true
    this.emit("start", { inputMint: params.inputMint, outputMint: params.outputMint, programIds: this.programIds.map((p) => p.toBase58()) })

    // warm decimals cache
    await Promise.all([
      this.ensureMintDecimals(params.inputMint),
      this.ensureMintDecimals(params.outputMint),
    ]).catch(() => void 0)

    const cb: LogsCallback = async (logInfo: Logs) => {
      const { signature, logs } = logInfo
      if (!this.trackingParams || this.processedSignatures.has(signature)) return

      // Fast path: look for obvious "swap" hints in program logs
      const hasSwapHint = logs.some((l) =>
        /swap|swapped|exchange|trade/i.test(l)
      )
      if (!hasSwapHint) return

      try {
        const tx = await this.connection.getParsedTransaction(signature, {
          commitment: this.commitment,
          maxSupportedTransactionVersion: 0,
        })
        if (!tx) return

        const evt = await this.extractSwapEvent(tx, signature)
        if (!evt) return

        // threshold checks
        const { minInputAmount, minOutputAmount } = this.trackingParams
        if (minInputAmount != null && evt.inputAmount < minInputAmount) return
        if (minOutputAmount != null && evt.outputAmount < minOutputAmount) return

        this.processedSignatures.add(signature)
        this.emit("swap", evt)
      } catch (err) {
        this.emit("error", { signature, error: err instanceof Error ? err.message : String(err) })
      }
    }

    // subscribe to all provided program ids
    for (const programId of this.programIds) {
      const subId = this.connection.onLogs(programId, cb, this.commitment)
      this.subscriptions.push(await subId)
    }
  }

  /** Stop all subscriptions and reset internal state for a fresh run */
  public async unsubscribeAll(): Promise<void> {
    for (const id of this.subscriptions) {
      try {
        await this.connection.removeOnLogsListener(id)
      } catch {
        // ignore
      }
    }
    this.subscriptions = []
    this.running = false
    this.processedSignatures.clear()
    this.emit("stop")
  }

  /** current status snapshot */
  public getStatus(): {
    running: boolean
    subscriptions: number
    trackedPair: TrackParams | null
    programIds: string[]
  } {
    return {
      running: this.running,
      subscriptions: this.subscriptions.length,
      trackedPair: this.trackingParams,
      programIds: this.programIds.map((p) => p.toBase58()),
    }
  }

  // ------------------------ internals ------------------------

  private async extractSwapEvent(
    tx: ParsedTransactionWithMeta,
    signature: string
  ): Promise<SwapEvent | null> {
    if (!this.trackingParams || !tx.meta) return null
    const { inputMint, outputMint } = this.trackingParams

    // find effective amounts by comparing pre/post token balances
    const inAmt = this.computeMintDelta(tx, inputMint, /*expectDecrease*/ true)
    const outAmt = this.computeMintDelta(tx, outputMint, /*expectDecrease*/ false)

    if (inAmt == null || outAmt == null) return null
    if (inAmt <= 0 || outAmt <= 0) return null

    // slot and time
    const slot = tx.slot
    let timestamp = Date.now()
    if (typeof (tx as any).blockTime === "number") {
      timestamp = (tx as any).blockTime * 1000
    } else {
      const t = await this.connection.getBlockTime(slot).catch(() => null)
      if (t) timestamp = t * 1000
    }

    // identify which program emitted logs in this tx among configured programIds
    const programId = this.pickProgramIdFromTx(tx) ?? this.programIds[0].toBase58()

    return {
      signature,
      slot,
      timestamp,
      inputMint,
      outputMint,
      inputAmount: inAmt,
      outputAmount: outAmt,
      programId,
    }
  }

  private pickProgramIdFromTx(tx: ParsedTransactionWithMeta): string | null {
    const keys = tx.transaction.message.instructions
      .map((ix: any) => ("programId" in ix ? ix.programId?.toBase58?.() : null))
      .filter(Boolean) as string[]
    for (const pid of keys) {
      if (this.programIds.some((p) => p.toBase58() === pid)) return pid
    }
    // try parsed program field
    for (const ix of tx.transaction.message.instructions as any[]) {
      if (ix?.program && typeof ix.program === "string") {
        const m = String(ix.program)
        const hit = this.programIds.find((p) => p.toBase58() === m)
        if (hit) return hit.toBase58()
      }
    }
    return null
  }

  /**
   * Compute absolute ui amount change for a given mint
   * If expectDecrease is true, we expect output to be negative (spent), otherwise positive (received)
   */
  private computeMintDelta(
    tx: ParsedTransactionWithMeta,
    mintStr: string,
    expectDecrease: boolean
  ): number | null {
    const meta = tx.meta
    if (!meta) return null
    const mint = mintStr

    // Sum deltas across owners for this mint
    const from = (meta.preTokenBalances ?? []).filter((b) => b.mint === mint)
    const to = (meta.postTokenBalances ?? []).filter((b) => b.mint === mint)

    // Build owner->amount maps for pre and post
    const preMap = new Map<string, number>()
    for (const b of from) {
      const ui = Number(b.uiTokenAmount?.uiAmount) || 0
      preMap.set(b.owner ?? b.accountIndex?.toString() ?? "", ui)
    }

    const postMap = new Map<string, number>()
    for (const b of to) {
      const ui = Number(b.uiTokenAmount?.uiAmount) || 0
      postMap.set(b.owner ?? b.accountIndex?.toString() ?? "", ui)
    }

    // union owners
    const owners = new Set<string>([...preMap.keys(), ...postMap.keys()])
    let totalDelta = 0
    for (const owner of owners) {
      const before = preMap.get(owner) ?? 0
      const after = postMap.get(owner) ?? 0
      const d = after - before
      totalDelta += d
    }

    // if we expected a decrease (input), take absolute magnitude of negative total
    // if we expected an increase (output), take magnitude of positive total
    if (expectDecrease) {
      return totalDelta < 0 ? -totalDelta : null
    } else {
      return totalDelta > 0 ? totalDelta : null
    }
  }

  private async ensureMintDecimals(mint: string): Promise<number> {
    if (this.decimalsCache.has(mint)) return this.decimalsCache.get(mint)!
    const info = await this.connection.getParsedAccountInfo(new PublicKey(mint)).catch(() => null)
    const decimals =
      (info?.value?.data as any)?.parsed?.info?.decimals ??
      (info?.value as any)?.data?.parsed?.info?.decimals
    if (typeof decimals === "number") {
      this.decimalsCache.set(mint, decimals)
      return decimals
    }
    // default to 0 if cannot resolve, but keep it cached to avoid repeated calls
    this.decimalsCache.set(mint, 0)
    return 0
  }
}

/*
filename options
- dex_track_service.ts
- dex_swap_tracker.ts
- dex_pair_listener.ts
*/
