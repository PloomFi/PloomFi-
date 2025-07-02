import { z } from "zod"

/**
 * Configuration for GetInfoTokenService
 */
export const getInfoTokenConfigSchema = z.object({
  /** Solana RPC endpoint */
  endpoint: z.string().url(),
  /** Commitment level */
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
})

export type GetInfoTokenConfig = z.infer<typeof getInfoTokenConfigSchema>

/**
 * Parameters for fetching token info
 */
export const getInfoTokenParamsSchema = z.object({
  /** SPL token mint address (Base58) */
  mintAddress: z
    .string()
    .min(32)
    .max(44)
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "invalid Base58 mint address"),
})

export type GetInfoTokenParams = z.infer<typeof getInfoTokenParamsSchema>

/**
 * Standard token information returned
 */
export interface TokenInfo {
  mint: string
  decimals: number
  supply: bigint
  isInitialized: boolean
  freezeAuthority?: string
  mintAuthority?: string
}
