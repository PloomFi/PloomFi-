import { z } from "zod"

/**
 * Configuration schema for TypesetService
 */
export const typesetConfigSchema = z.object({
  /** Whether to convert straight quotes to curly quotes */
  enableSmartQuotes: z.boolean().default(true),
  /** Whether to replace three dots with ellipsis character */
  enableEllipsis: z.boolean().default(true),
  /** Whether to convert double hyphens `--` into em-dash `—` */
  enableEmDashes: z.boolean().default(true),
})

export type TypesetConfig = z.infer<typeof typesetConfigSchema>

/**
 * Parameters for a typesetting operation
 */
export const typesetParamsSchema = z.object({
  /** Raw input text to be typeset */
  text: z.string().min(1),
})

export type TypesetParams = z.infer<typeof typesetParamsSchema>

/**
 * Result of a typesetting operation
 */
export interface TypesetResult {
  /** The transformed, typeset text */
  output: string
  /** Timestamp when transformation occurred */
  timestamp: number
}
