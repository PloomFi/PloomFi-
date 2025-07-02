import { z } from "zod"

/**
 * Configuration for SwapKitService
 */
export const swapKitConfigSchema = z.object({
  /** Base URL of the swapping API or RPC endpoint */
  endpoint: z.string().url(),
  /** Commitment level for on-chain fetches */
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
  /** Optional API key for external quote services */
  apiKey: z.string().optional(),
  /** Timeout for network requests (ms) */
  timeoutMs: z.number().int().positive().default(10_000),
})

export type SwapKitConfig = z.infer<typeof swapKitConfigSchema>

/**
 * Parameters for fetching a swap quote
 */
export const quoteParamsSchema = z.object({
  /** Input token mint address */
  inputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
  /** Output token mint address */
  outputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
  /** Amount of input token in base units */
  amountIn: z.number().int().positive(),
})

export type QuoteParams = z.infer<typeof quoteParamsSchema>

/**
 * Parameters for executing a swap
 */
export const swapParamsSchema = z.object({
  /** Input token mint address */
  inputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
  /** Output token mint address */
  outputMint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
  /** Amount of input token in base units */
  amountIn: z.number().int().positive(),
  /** Minimum acceptable output amount (slippage protection) */
  minAmountOut: z.number().int().positive(),
  /** User wallet address for signing */
  userAddress: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 address"),
  /** Optional fee payer address */
  feePayerAddress: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/).optional(),
})

export type SwapParams = z.infer<typeof swapParamsSchema>

/**
 * Quote result returned by the service
 */
export interface SwapQuote {
  bestRoute: string[]
  amountOut: number
  estimatedFee: number
  slippagePct: number
  timestamp: number
}

/**
 * Swap execution result
 */
export interface SwapExecution {
  signature: string
  slot: number
  inputMint: string
  outputMint: string
  amountIn: number
  amountOut: number
  fee: number
  timestamp: number
}
