import { z } from "zod"

/**
 * Configuration for ToolsetService
 */
export const toolsetConfigSchema = z.object({
  /** Optional list of available tool names */
  tools: z.array(z.string().min(1)).default([]),
  /** Maximum concurrent tool executions */
  maxConcurrent: z.number().int().positive().default(5),
})

export type ToolsetConfig = z.infer<typeof toolsetConfigSchema>

/**
 * Definition of a single tool invocation
 */
export const toolInvokeParamsSchema = z.object({
  /** Name of the tool to call */
  toolName: z.string().min(1),
  /** Arbitrary payload for the tool */
  payload: z.record(z.unknown()),
})

export type ToolInvokeParams = z.infer<typeof toolInvokeParamsSchema>

/**
 * Result of a tool execution
 */
export interface ToolResult {
  toolName: string
  success: boolean
  output?: unknown
  error?: string
}

/**
 * Summary of a batch of tool executions
 */
export interface ToolsetSummary {
  total: number
  successes: number
  failures: number
  results: ToolResult[]
}
