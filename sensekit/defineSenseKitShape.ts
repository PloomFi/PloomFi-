import { z } from "zod"
import { PublicKey } from "@solana/web3.js"

/**
 * Configuration for SenseKitService
 */
export const senseKitConfigSchema = z.object({
  /** Solana JSON RPC endpoint */
  endpoint: z.string().url(),
  /** Commitment level for subscriptions */
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
  /** Optional external sentiment API URL */
  sentimentApiUrl: z.string().url().optional(),
})

export type SenseKitConfig = z.infer<typeof senseKitConfigSchema>

/**
 * Parameters for monitoring on‐chain events
 */
export const monitorParamsSchema = z.object({
  /** Program or account to watch */
  address: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 address"),
  /** Keywords to filter logs for (e.g., ["mint","burn"]) */
  keywords: z.array(z.string().min(1)).optional(),
})

export type MonitorParams = z.infer<typeof monitorParamsSchema>

/**
 * Parameters for requesting sentiment analysis
 */
export const sentimentParamsSchema = z.object({
  /** Text to analyze sentiment for */
  text: z.string().min(1),
})

export type SentimentParams = z.infer<typeof sentimentParamsSchema>

/**
 * Emitted when a matching on‐chain log is detected
 */
export interface SenseEvent {
  signature: string
  slot: number
  log: string
}

/**
 * Result of sentiment analysis
 */
export interface SentimentResult {
  text: string
  score: number   // -1 (negative) to +1 (positive)
  timestamp: number
}
