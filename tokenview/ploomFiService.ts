import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { EventEmitter } from "events"
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import {
  ploomFiConfigSchema,
  PloomFiConfig,
  vaultActionParamsSchema,
  VaultActionParams,
  VaultMetrics,
} from "./definePloomFiShape"

/**
 * PloomFiService handles deposit/withdraw and metrics for yield vaults
 */
export class PloomFiService extends EventEmitter {
  private conn: Connection
  private config: PloomFiConfig

  constructor(rawConfig: unknown) {
    super()
    this.config = ploomFiConfigSchema.parse(rawConfig)
    this.conn = new Connection(this.config.endpoint, this.config.commitment)
  }

  /**
   * Deposit tokens into a vault
   */
  public async deposit(raw: unknown): Promise<string> {
    const { user, vault, amount }: VaultActionParams = vaultActionParamsSchema.parse(raw)
    const userKey = new PublicKey(user)
    const vaultKey = new PublicKey(vault)
    // placeholder: build deposit instruction
    const tx = new Transaction().add({
      keys: [{ pubkey: userKey, isSigner: true, isWritable: true }, { pubkey: vaultKey, isSigner: false, isWritable: true }],
      programId: new PublicKey(vault),
      data: Buffer.from(Uint8Array.of(0, ...new BN(amount).toArray("le", 8))),
    })
    tx.feePayer = userKey
    const { blockhash } = await this.conn.getLatestBlockhash()
    tx.recentBlockhash = blockhash
    const sig = await this.conn.sendTransaction(tx, []) // assume signer elsewhere
    this.emit("deposit", { vault, user, amount, signature: sig })
    return sig
  }

  /**
   * Withdraw tokens and yield from a vault
   */
  public async withdraw(raw: unknown): Promise<string> {
    const { user, vault, amount }: VaultActionParams = vaultActionParamsSchema.parse(raw)
    const userKey = new PublicKey(user)
    const vaultKey = new PublicKey(vault)
    // placeholder: build withdraw instruction
    const tx = new Transaction().add({
      keys: [{ pubkey: userKey, isSigner: true, isWritable: true }, { pubkey: vaultKey, isSigner: false, isWritable: true }],
      programId: new PublicKey(vault),
      data: Buffer.from(Uint8Array.of(1, ...new BN(amount).toArray("le", 8))),
    })
    tx.feePayer = userKey
    const { blockhash } = await this.conn.getLatestBlockhash()
    tx.recentBlockhash = blockhash
    const sig = await this.conn.sendTransaction(tx, [])
    this.emit("withdraw", { vault, user, amount, signature: sig })
    return sig
  }

  /**
   * Fetch metrics for a given vault
   */
  public async getVaultMetrics(vault: string): Promise<VaultMetrics> {
    const vaultKey = new PublicKey(vault)
    // placeholder: fetch on‐chain account data
    const acct = await this.conn.getAccountInfo(vaultKey, this.config.commitment)
    if (!acct?.data) throw new Error("Vault not found")
    // decode: [totalDeposited: u64, totalYield: u64, apy: u32, updated: u64]
    const buf = acct.data
    const totalDeposited = buf.readBigUInt64LE(0)
    const totalYield = buf.readBigUInt64LE(8)
    const apyPercent = buf.readUInt32LE(16) / 100
    const lastUpdated = Number(buf.readBigUInt64LE(20))
    const metrics: VaultMetrics = {
      vault,
      totalDeposited,
      totalYield,
      apyPercent,
      lastUpdated,
    }
    this.emit("metrics", metrics)
    return metrics
  }
}
