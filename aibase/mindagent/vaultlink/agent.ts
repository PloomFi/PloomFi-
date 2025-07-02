// File: defineCryptureVaultShape.ts
import { z } from "zod"

/**
 * Configuration for Crypture Vault AI Wallet
 */
export const cryptureVaultConfigSchema = z.object({
  /** Base58 wallet address to manage */
  walletAddress: z
    .string()
    .min(32, "address too short")
    .max(44, "address too long")
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "invalid Base58 address"),

  /** RPC cluster to connect to */
  network: z.enum(["mainnet", "devnet"]).default("mainnet"),

  /** Poll interval in milliseconds for balance updates */
  scanIntervalMs: z.number().int().positive().default(30000),

  /** Threshold (in UI units) above which alerts are triggered */
  alertThreshold: z.number().nonnegative().default(1000),

  /** Model type for AI-driven risk analysis */
  riskModel: z.enum(["basic", "advanced"]).default("basic"),
})

export type CryptureVaultConfig = z.infer<typeof cryptureVaultConfigSchema>

/**
 * Summary of vault state with risk analysis
 */
export interface VaultSummary {
  walletAddress: string
  totalBalance: number      // sum of UI amounts
  tokenCount: number
  riskScore: number         // 0 (low) - 100 (high)
  alerts: string[]
  timestamp: number
}


// File: cryptureVaultAgent.ts
import { Connection, PublicKey, ParsedAccountData } from "@solana/web3.js"
import { EventEmitter } from "events"
import { RiskScoringService } from "./riskScoring"
import {
  cryptureVaultConfigSchema,
  CryptureVaultConfig,
  VaultSummary,
} from "./defineCryptureVaultShape"

/**
 * CryptureVaultAgent monitors on-chain balances and runs AI risk analysis
 */
export class CryptureVaultAgent extends EventEmitter {
  private readonly conn: Connection
  private readonly config: CryptureVaultConfig
  private readonly riskService = new RiskScoringService()
  private timer: NodeJS.Timeout | null = null

  constructor(rawConfig: unknown) {
    super()
    this.config = cryptureVaultConfigSchema.parse(rawConfig)
    const endpoint =
      this.config.network === "devnet"
        ? "https://api.devnet.solana.com"
        : "https://api.mainnet-beta.solana.com"
    this.conn = new Connection(endpoint, "confirmed")
  }

  /** Start periodic polling and analysis */
  public start() {
    if (this.timer) return
    this.poll()
    this.timer = setInterval(() => this.poll(), this.config.scanIntervalMs)
  }

  /** Stop polling */
  public stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /** Internal: fetch balances, compute risk, and emit summary */
  private async poll() {
    try {
      const { walletAddress, alertThreshold } = this.config
      const owner = new PublicKey(walletAddress)
      const resp = await this.conn.getParsedTokenAccountsByOwner(owner, {
        programId: new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        ),
      })

      let total = 0
      const uiAmounts: number[] = []
      for (const { account } of resp.value) {
        const info = (account.data as ParsedAccountData).parsed.info.tokenAmount
        const amt = parseInt(info.amount, 10) / 10 ** info.decimals
        if (amt > 0) {
          total += amt
          uiAmounts.push(amt)
        }
      }

      const { score } = this.riskService.computeRisk({
        volume24h: total,
        uniqueAddresses24h: uiAmounts.length,
        txCount24h: uiAmounts.length * 5,
        tokenAgeDays: 30,
      })

      const alerts: string[] = []
      if (total >= alertThreshold) {
        alerts.push(
          `Balance above threshold: ${total.toFixed(2)} ≥ ${alertThreshold}`
        )
      }
      if (score > 75) {
        alerts.push(`High risk detected: score ${score}`)
      }

      const summary: VaultSummary = {
        walletAddress,
        totalBalance: total,
        tokenCount: uiAmounts.length,
        riskScore: score,
        alerts,
        timestamp: Date.now(),
      }

      this.emit("summary", summary)
    } catch (err) {
      this.emit("error", err)
    }
  }
}
