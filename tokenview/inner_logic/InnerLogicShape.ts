import { z } from "zod"

/**
 * Configuration schema for InnerLogic orchestrator
 */
export const innerLogicConfigSchema = z.object({
  /** Flag to enable verbose debug logging */
  debug: z.boolean().default(false),
  /** Maximum retry attempts for failed steps */
  maxRetries: z.number().int().nonnegative().default(3),
  /** Timeout per step in milliseconds */
  stepTimeoutMs: z.number().int().positive().default(10_000),
})

export type InnerLogicConfig = z.infer<typeof innerLogicConfigSchema>

/**
 * Parameters for a single logic step
 */
export const logicStepSchema = z.object({
  /** Unique step identifier */
  id: z.string().min(1),
  /** Human-readable description */
  description: z.string().min(1),
  /** Function to execute (module.method) */
  action: z.string().regex(/^[\w\-]+?\.[\w\-]+$/, "must be in format module.method"),
  /** Payload for the action */
  payload: z.record(z.unknown()),
})

export type LogicStep = z.infer<typeof logicStepSchema>

/**
 * Workflow containing ordered logic steps
 */
export const innerWorkflowSchema = z.object({
  steps: z.array(logicStepSchema).min(1),
})

export type InnerWorkflow = z.infer<typeof innerWorkflowSchema>

/**
 * Result of executing one logic step
 */
export interface StepResult {
  stepId: string
  success: boolean
  output?: unknown
  error?: string
}

/**
 * Final result of running an inner workflow
 */
export interface WorkflowExecutionResult {
  results: StepResult[]
  completed: boolean
}
