import { z } from "zod"

/**
 * Configuration for the Orchestrator API client
 */
export const orchestratorConfigSchema = z.object({
  /** Base URL for orchestration API */
  orchestratorUrl: z.string().url(),
  /** Authorization token for API calls */
  authToken: z.string().min(1),
  /** Default timeout for each request (ms) */
  requestTimeoutMs: z.number().int().positive().default(10_000),
})

export type OrchestratorConfig = z.infer<typeof orchestratorConfigSchema>

/**
 * Parameters for invoking a workflow
 */
export const invokeWorkflowSchema = z.object({
  /** Identifier of the workflow to invoke */
  workflowId: z.string().min(1),
  /** Input payload for the workflow */
  payload: z.record(z.unknown()),
})

export type InvokeWorkflowParams = z.infer<typeof invokeWorkflowSchema>

/**
 * Standard response from the orchestrator
 */
export interface OrchestratorResponse {
  workflowId: string
  success: boolean
  result?: unknown
  error?: string
  timestamp: number
}
