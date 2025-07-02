import { z } from "zod"

/**
 * Configuration schema for SendLogicService
 */
export const sendLogicConfigSchema = z.object({
  /** Base URL of the logic execution endpoint */
  endpoint: z.string().url(),
  /** API key or token for authentication */
  apiKey: z.string().min(1),
  /** Request timeout in milliseconds */
  timeoutMs: z.number().int().positive().default(10_000),
})

export type SendLogicConfig = z.infer<typeof sendLogicConfigSchema>

/**
 * Parameters for a single logic dispatch
 */
export const logicDispatchParamsSchema = z.object({
  /** Identifier of the logic to execute */
  logicId: z.string().min(1),
  /** Payload to pass into the logic */
  payload: z.record(z.unknown()),
})

export type LogicDispatchParams = z.infer<typeof logicDispatchParamsSchema>

/**
 * Result of dispatching logic
 */
export interface DispatchResult {
  /** Logic identifier */
  logicId: string
  /** Whether the dispatch succeeded */
  success: boolean
  /** Response payload on success */
  response?: unknown
  /** Error message on failure */
  error?: string
}
