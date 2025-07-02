import { z } from "zod"

/**
 * Configuration for BalanceBot
 */
export const balanceBotConfigSchema = z.object({
  /** RPC endpoint URL */
  endpoint: z.string().url(),
  /** Commitment level for queries */
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
  /** Poll interval in milliseconds */
  pollIntervalMs: z.number().int().positive().default(30000),
})

export type BalanceBotConfig = z.infer<typeof balanceBotConfigSchema>

/**
 * Parameters for tracking a wallet balance
 */
export const trackBalanceParamsSchema = z.object({
  /** Base58 wallet address to monitor */
  walletAddress: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 address"),
  /** Minimum lamports change to trigger an alert */
  deltaThreshold: z.number().int().nonnegative().default(0),
})

export type TrackBalanceParams = z.infer<typeof trackBalanceParamsSchema>

/**
 * Emitted when a significant balance change is detected
 */
export interface BalanceChangeEvent {
  walletAddress: string
  oldBalance: number
  newBalance: number
  delta: number
  timestamp: number
}

/**
 * Result returned by manual balance check
 */
export interface BalanceCheckResult {
  walletAddress: string
  balance: number
  timestamp: number
}
