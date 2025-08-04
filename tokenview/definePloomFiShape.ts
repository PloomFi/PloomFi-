import { z } from "zod"
import { PublicKey, Commitment } from "@solana/web3.js"

/**
 * Configuration for PloomFi aggregator
 */
export const ploomFiConfigSchema = z.object({
  /** RPC endpoint URL */
  endpoint: z.string().url(),
  /** Commitment level */
  commitment: z.nativeEnum({ processed: "processed", confirmed: "confirmed", finalized: "finalized" } as const)
    .default("confirmed" as Commitment),
  /** Fee collector public key */
  feeCollector: z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Base58 public key")
    .transform((s) => new PublicKey(s)),
  /** Platform fee rate (0–1) */
  platformFeeRate: z.number().min(0).max(1).default(0.002),
})

export type PloomFiConfig = z.infer<typeof ploomFiConfigSchema>

/**
 * Parameters for vault interactions
 */
export const vaultActionParamsSchema = z.object({
  /** User wallet public key */
  user: z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Base58 public key")
    .transform((s) => new PublicKey(s)),
  /** Vault account public key */
  vault: z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Base58 public key")
    .transform((s) => new PublicKey(s)),
  /** Amount in base units (integer > 0) */
  amount: z.number().int().positive(),
})

export type VaultActionParams = z.infer<typeof vaultActionParamsSchema>

/**
 * Schema for vault metrics response
 */
export const vaultMetricsSchema = z.object({
  vault: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Invalid Base58 public key"),
  totalDeposited: z
    .union([z.string(), z.bigint()])
    .transform((v) => BigInt(v)),
  totalYield: z
    .union([z.string(), z.bigint()])
    .transform((v) => BigInt(v)),
  apyPercent: z.number().min(0).max(10_000),
  lastUpdated: z.preprocess((v) => {
    const n = Number(v)
    if (isNaN(n)) throw new Error("Invalid timestamp")
    return n
  }, z.number().int().nonnegative()),
})

export type VaultMetrics = z.infer<typeof vaultMetricsSchema>
