import {
  Commitment,
  Connection,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
  SendOptions,
} from "@solana/web3.js"
import { EventEmitter } from "events"
import {
  vaultsConfigSchema,
  VaultsConfig,
  vaultActionParamsSchema,
  VaultActionParams,
  vaultMetricsParamsSchema,
  VaultMetricsParams,
  VaultMetrics,
} from "./defineVaultsShape"
import { BN } from "bn.js"

/**
 * VaultsService handles deposit, withdrawal, and metrics for on-chain vaults.
 * Improvements:
 *  - Uses v0 transactions with recent blockhash + compute budget bump
 *  - Input validation & clearer errors
 *  - Optional preflight simulate; confirmation after send
 *  - Safe account decoding with buffer length checks
 *  - Emits granular lifecycle events: "<op>:start", "<op>:success", "<op>:error"
 */
export class VaultsService extends EventEmitter {
  private connection: Connection
  private config: VaultsConfig
  private readonly commitment: Commitment

  constructor(rawConfig: unknown) {
    super()
    this.config = vaultsConfigSchema.parse(rawConfig)
    this.commitment = this.config.commitment ?? "confirmed"
    this.connection = new Connection(this.config.endpoint, this.commitment)
  }

  /**
   * Deposit tokens into a vault by sending a custom CPI instruction.
   * NOTE: This constructs a **program-defined** instruction where the first byte is the opcode.
   */
  public async deposit(raw: unknown): Promise<string> {
    const params: VaultActionParams = vaultActionParamsSchema.parse(raw)
    return this.#performAction("deposit", 0, params)
  }

  /**
   * Withdraw tokens from a vault by sending a custom CPI instruction.
   */
  public async withdraw(raw: unknown): Promise<string> {
    const params: VaultActionParams = vaultActionParamsSchema.parse(raw)
    return this.#performAction("withdraw", 1, params)
  }

  /**
   * Fetch vault metrics by reading the vault account data.
   * Expected layout (little-endian):
   * [deposits: u64, withdrawals: u64, balance: u64, slot: u64] => total 32 bytes
   */
  public async getMetrics(raw: unknown): Promise<VaultMetrics> {
    const { vaultAccount }: VaultMetricsParams = vaultMetricsParamsSchema.parse(raw)
    const vaultPub = new PublicKey(vaultAccount)

    const acct = await this.connection.getAccountInfo(vaultPub, this.commitment)
    if (!acct?.data) {
      const err = new Error("Vault account not found")
      this.emit("metrics:error", { vaultAccount, error: err })
      throw err
    }
    if (acct.data.length < 32) {
      const err = new Error(`Vault account data too short: ${acct.data.length}B`)
      this.emit("metrics:error", { vaultAccount, error: err })
      throw err
    }

    // Buffer has readBigUInt64LE in Node 12+
    const totalDeposits = acct.data.readBigUInt64LE(0)
    const totalWithdrawals = acct.data.readBigUInt64LE(8)
    const currentBalance = acct.data.readBigUInt64LE(16)
    const lastUpdatedSlot = Number(acct.data.readBigUInt64LE(24))

    const metrics: VaultMetrics = {
      vaultAccount,
      totalDeposits,
      totalWithdrawals,
      currentBalance,
      lastUpdatedSlot,
    }

    this.emit("metrics", metrics)
    return metrics
  }

  // ------------------------------------------------------------------
  // Internals
  // ------------------------------------------------------------------

  /**
   * Shared flow for deposit/withdraw.
   */
  async #performAction(
    op: "deposit" | "withdraw",
    opcode: number,
    { userAddress, vaultAccount, amount }: VaultActionParams
  ): Promise<string> {
    const userPub = new PublicKey(userAddress)
    const vaultPub = new PublicKey(vaultAccount)
    const programId = new PublicKey(this.config.vaultProgramId)

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("amount must be a positive number")
    }

    // Instruction data: [opcode:u8, amount:u64(le)]
    const data = Buffer.concat([Buffer.from([opcode]), new BN(amount).toArrayLike(Buffer, "le", 8)])

    const ix = new TransactionInstruction({
      keys: [
        { pubkey: userPub, isSigner: true, isWritable: true },
        { pubkey: vaultPub, isSigner: false, isWritable: true },
      ],
      programId,
      data,
    })

    // Add a small CU bump to reduce "CU exhausted" flakes
    const computeIxs = [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: this.config.computeUnitPrice ?? 0 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: this.config.computeUnitLimit ?? 200_000 }),
    ]

    this.emit(`${op}:start`, { userAddress, vaultAccount, amount })

    // Build v0 transaction (message)
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash(
      this.commitment
    )

    const message = new TransactionMessage({
      payerKey: userPub,
      recentBlockhash: blockhash,
      instructions: [...computeIxs, ix],
    }).compileToV0Message()

    const vtx = new VersionedTransaction(message)

    // Sign (wire up your wallet/Keypair outside; this is intentionally abstract)
    const signed = await this.sign(vtx, userPub)

    // Optional: preflight simulate for clearer errors
    if (this.config.preflight !== false) {
      const sim = await this.connection.simulateTransaction(signed, { sigVerify: false })
      if (sim.value.err) {
        const err = new Error(`preflight simulation failed: ${JSON.stringify(sim.value.err)}`)
        this.emit(`${op}:error`, { userAddress, vaultAccount, amount, error: err })
        throw err
      }
    }

    const sendOpts: SendOptions = {
      skipPreflight: this.config.preflight === false,
      preflightCommitment: this.commitment,
      maxRetries: this.config.maxRetries ?? 3,
    }

    const signature = await this.connection.sendRawTransaction(signed.serialize(), sendOpts)

    // Confirm until lastValidBlockHeight
    await this.connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      this.commitment
    )

    this.emit(`${op}:success`, { userAddress, vaultAccount, amount, signature })
    return signature
  }

  /**
   * Helper: request the wallet to sign the transaction.
   * Replace this with your wallet adapter / injected signer.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async sign(tx: VersionedTransaction, _signerPub: PublicKey): Promise<VersionedTransaction> {
    // In practice, inject a signer (Keypair/adapter) via the constructor.
    // This placeholder ensures type-safety while signaling integration point.
    // @ts-ignore
    if (typeof (tx as any).sign !== "function") {
      throw new Error("signer not configured: provide a wallet/Keypair to sign the transaction")
    }
    // @ts-ignore
    return (await (tx as any).sign()) as VersionedTransaction
  }
}
