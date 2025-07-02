import { z } from "zod"
import { PublicKey } from "@solana/web3.js"

/**
 * Configuration for PloomFi aggregator
 */
export const ploomFiConfigSchema = z.object({
  /** RPC endpoint URL */
  endpoint: z.string().url(),
  /** Commitment level */
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
  /** Fee collector address */
  feeCollector: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 public key"),
  /** Platform fee (0–1) */
  platformFeeRate: z.number().min(0).max(1).default(0.002),
})

export type PloomFiConfig = z.infer<typeof ploomFiConfigSchema>

/**
 * Parameters for vault interactions
 */
export const vaultActionParamsSchema = z.object({
  /** User wallet address */
  user: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  /** Vault account public key */
  vault: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/),
  /** Amount in base units */
  amount: z.number().int().positive(),
})

export type VaultActionParams = z.infer<typeof vaultActionParamsSchema>

/**
 * Response for vault metrics
 */
export interface VaultMetrics {
  vault: string
  totalDeposited: bigint
  totalYield: bigint
  apyPercent: number
  lastUpdated: number
}
