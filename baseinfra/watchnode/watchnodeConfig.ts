import { z } from "zod"

/**
 * Configuration for WatchNodeService
 */
export const watchnodeConfigSchema = z.object({
  /** JSON-RPC/WebSocket endpoint URL */
  endpoint: z.string().url(),
  /** Commitment level for subscriptions */
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
})

export type WatchnodeConfig = z.infer<typeof watchnodeConfigSchema>

/**
 * Parameters for monitoring a Solana account or program
 */
export const watchnodeParamsSchema = z.object({
  /** Base58 address to watch (account or program) */
  address: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 address"),
  /** Optional list of log keywords to filter */
  keywords: z.array(z.string().min(1)).optional(),
})

export type WatchnodeParams = z.infer<typeof watchnodeParamsSchema>

/**
 * Emitted event payload when a matching log is detected
 */
export interface WatchLogEvent {
  signature: string
  slot: number
  log: string
}
