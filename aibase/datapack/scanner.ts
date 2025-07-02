import { z } from "zod"

/**
 * Configuration for the Solana Token Activity Detector
 */
export const solanaTokenActivityDetectorConfigSchema = z.object({
  /** RPC endpoint URL */
  endpoint: z.string().url(),
  /** Commitment level for fetching signatures */
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
  /** Maximum number of signatures to scan */
  maxSignatures: z.number().int().positive().default(1000),
})

export type SolanaTokenActivityDetectorConfig = z.infer<
  typeof solanaTokenActivityDetectorConfigSchema
>

/**
 * Parameters for scanning token activity
 */
export const scanTokenActivityParamsSchema = z.object({
  /** SPL token mint address to scan */
  tokenMint: z.string().regex(
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    "invalid Base58 mint address"
  ),
})

export type ScanTokenActivityParams = z.infer<
  typeof scanTokenActivityParamsSchema
>

/**
 * Single transfer event detected
 */
export interface TokenTransferEvent {
  signature: string
  slot: number
  source: string
  destination: string
  amount: number
}

/**
 * Result of a token activity scan
 */
export interface TokenActivityScanResult {
  tokenMint: string
  events: TokenTransferEvent[]
  scanned: number
  timestamp: number
}
