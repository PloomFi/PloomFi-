import { z } from "zod"
import { PublicKey } from "@solana/web3.js"

/**
 * Configuration for InsightLabService
 */
export const insightLabConfigSchema = z.object({
  /** Solana RPC endpoint or custom API */
  endpoint: z.string().url(),
  /** Commitment level for RPC calls */
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
  /** Optional external analytics API key */
  apiKey: z.string().optional(),
})

export type InsightLabConfig = z.infer<typeof insightLabConfigSchema>

/**
 * Parameters to run a full token insight report
 */
export const insightParamsSchema = z.object({
  /** SPL token mint to analyze */
  mint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
  /** Lookback window in hours */
  windowHours: z.number().int().positive().default(24),
  /** Bucket count for time-series aggregation */
  buckets: z.number().int().positive().default(24),
  /** Optional flag to include pattern detection */
  detectPatterns: z.boolean().default(true),
})

export type InsightParams = z.infer<typeof insightParamsSchema>

/**
 * Combined insight report
 */
export interface InsightReport {
  mint: string
  activityHeatmap: number[][]      // [timeBucket][hourBucket]
  patternEvents?: {
    index: number
    type: "spike" | "dump"
    metric: "transfer" | "volume"
  }[]
  riskScore: number                // 0–100
  timestamp: number
}
