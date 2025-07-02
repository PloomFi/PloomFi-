import { z } from "zod"

/**
 * Configuration for AIBaseService
 */
export const aiBaseConfigSchema = z.object({
  /** AI API endpoint URL */
  endpoint: z.string().url(),
  /** API key or token for authentication */
  apiKey: z.string().min(1),
  /** Default model to use */
  defaultModel: z.string().min(1).default("gpt-4"),
  /** Request timeout in milliseconds */
  timeoutMs: z.number().int().positive().default(10_000),
})

export type AiBaseConfig = z.infer<typeof aiBaseConfigSchema>

/**
 * Parameters for generating a completion
 */
export const completionParamsSchema = z.object({
  /** The prompt or input text */
  prompt: z.string().min(1),
  /** Optional override of the model */
  model: z.string().optional(),
  /** Maximum tokens to generate */
  maxTokens: z.number().int().positive().default(256),
  /** Temperature for sampling (0–1) */
  temperature: z.number().min(0).max(1).default(0.7),
})

export type CompletionParams = z.infer<typeof completionParamsSchema>

/**
 * Result of an AI completion request
 */
export interface CompletionResult {
  /** The generated text */
  text: string
  /** Original prompt echoed back */
  prompt: string
  /** Model used */
  model: string
  /** Timestamp of the response */
  timestamp: number
}
