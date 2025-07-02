import { Connection, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js"
import { EventEmitter } from "events"
import { z } from "zod"

/** Configuration schema for DexTrackService */
const dexTrackConfigSchema = z.object({
  endpoint: z.string().url(),
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
})

export type DexTrackConfig = z.infer<typeof dexTrackConfigSchema>

/** Parameters for tracking a trading pair */
const trackParamsSchema = z.object({
  inputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
  outputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
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
}

/**
 * DexTrackService listens for swap events on a given pair
 */
export class DexTrackService extends EventEmitter {
  private connection: Connection
  private commitment: DexTrackConfig["commitment"]

  constructor(rawConfig: unknown) {
    super()
    const { endpoint, commitment } = dexTrackConfigSchema.parse(rawConfig)
    this.connection = new Connection(endpoint, commitment)
    this.commitment = commitment
  }

  /**
   * Subscribe to on-chain logs and emit SwapEvent whenever a swap between
   * inputMint and outputMint occurs.
   */
  public async subscribe(rawParams: unknown): Promise<void> {
    const { inputMint, outputMint }: TrackParams = trackParamsSchema.parse(rawParams)
    const programKey = new PublicKey(inputMint) // placeholder; real DEX program ID
    this.connection.onLogs(
      programKey,
      async (logInfo) => {
        const { signature, logs } = logInfo
        // attempt to parse swap lines
        for (const line of logs) {
          if (line.startsWith("Swap:")) {
            const m = /input=([A-Za-z0-9]+):([\d.]+)\s+output=([A-Za-z0-9]+):([\d.]+)/.exec(line)
            if (m && m[1] === inputMint && m[3] === outputMint) {
              const slot = await this.resolveSlot(signature)
              const evt: SwapEvent = {
                signature,
                slot,
                timestamp: Date.now(),
                inputMint,
                outputMint,
                inputAmount: parseFloat(m[2]),
                outputAmount: parseFloat(m[4]),
              }
              this.emit("swap", evt)
            }
          }
        }
      },
      this.commitment
    )
  }

  /**
   * Helper to resolve slot for a given signature
   */
  private async resolveSlot(signature: string): Promise<number> {
    const res = await this.connection.getSignatureStatuses([signature], { searchTransactionHistory: true })
    return res.value[0]?.slot ?? -1
  }
}
