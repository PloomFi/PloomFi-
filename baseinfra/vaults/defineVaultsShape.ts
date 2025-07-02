import { Connection, PublicKey, Transaction } from "@solana/web3.js"
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
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { BN } from "bn.js"

/**
 * VaultsService handles deposit, withdrawal, and metrics for on‐chain vaults.
 */
export class VaultsService extends EventEmitter {
  private connection: Connection
  private config: VaultsConfig

  constructor(rawConfig: unknown) {
    super()
    this.config = vaultsConfigSchema.parse(rawConfig)
    this.connection = new Connection(this.config.endpoint, this.config.commitment)
  }

  /**
   * Deposit tokens into a vault by sending a custom CPI instruction.
   */
  public async deposit(raw: unknown): Promise<string> {
    const { userAddress, vaultAccount, amount }: VaultActionParams =
      vaultActionParamsSchema.parse(raw)

    const userPub = new PublicKey(userAddress)
    const vaultPub = new PublicKey(vaultAccount)
    const programId = new PublicKey(this.config.vaultProgramId)

    // Placeholder instruction: first byte 0 = deposit
    const data = Buffer.concat([
      Buffer.from([0]),
      new BN(amount).toArrayLike(Buffer, "le", 8),
    ])

    const tx = new Transaction().add({
      keys: [
        { pubkey: userPub, isSigner: true, isWritable: true },
        { pubkey: vaultPub, isSigner: false, isWritable: true },
      ],
      programId,
      data,
    })

    tx.feePayer = userPub
    const { blockhash } = await this.connection.getLatestBlockhash(this.config.commitment)
    tx.recentBlockhash = blockhash

    const signed = await this.sign(tx, userPub)
    const sig = await this.connection.sendRawTransaction(signed.serialize())
    this.emit("deposit", { vaultAccount, userAddress, amount, signature: sig })
    return sig
  }

  /**
   * Withdraw tokens from a vault by sending a custom CPI instruction.
   */
  public async withdraw(raw: unknown): Promise<string> {
    const { userAddress, vaultAccount, amount }: VaultActionParams =
      vaultActionParamsSchema.parse(raw)

    const userPub = new PublicKey(userAddress)
    const vaultPub = new PublicKey(vaultAccount)
    const programId = new PublicKey(this.config.vaultProgramId)

    // Placeholder instruction: first byte 1 = withdraw
    const data = Buffer.concat([
      Buffer.from([1]),
      new BN(amount).toArrayLike(Buffer, "le", 8),
    ])

    const tx = new Transaction().add({
      keys: [
        { pubkey: userPub, isSigner: true, isWritable: true },
        { pubkey: vaultPub, isSigner: false, isWritable: true },
      ],
      programId,
      data,
    })

    tx.feePayer = userPub
    const { blockhash } = await this.connection.getLatestBlockhash(this.config.commitment)
    tx.recentBlockhash = blockhash

    const signed = await this.sign(tx, userPub)
    const sig = await this.connection.sendRawTransaction(signed.serialize())
    this.emit("withdraw", { vaultAccount, userAddress, amount, signature: sig })
    return sig
  }

  /**
   * Fetch vault metrics by reading the vault account data.
   */
  public async getMetrics(raw: unknown): Promise<VaultMetrics> {
    const { vaultAccount }: VaultMetricsParams = vaultMetricsParamsSchema.parse(raw)
    const vaultPub = new PublicKey(vaultAccount)
    const acct = await this.connection.getAccountInfo(vaultPub, this.config.commitment)
    if (!acct?.data) throw new Error("Vault account not found")

    // Decode layout: [deposits: u64, withdrawals: u64, balance: u64, slot: u64]
    const buf = acct.data
    const totalDeposits = buf.readBigUInt64LE(0)
    const totalWithdrawals = buf.readBigUInt64LE(8)
    const currentBalance = buf.readBigUInt64LE(16)
    const lastUpdatedSlot = Number(buf.readBigUInt64LE(24))

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

  /**
   * Helper: request the wallet to sign the transaction
   */
  private async sign(tx: Transaction, signerPub: PublicKey): Promise<Transaction> {
    // In practice you'd inject the Keypair or wallet adapter; placeholder here:
    // @ts-ignore
    return (await (tx as any).sign(signerPub)) as Transaction
  }
}
