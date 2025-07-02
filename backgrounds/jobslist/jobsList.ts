import { z } from "zod"

/**
 * Configuration for JobsListService
 */
export const jobsListConfigSchema = z.object({
  /** RPC/WebSocket endpoint URL for job updates */
  endpoint: z.string().url(),
  /** Poll interval in milliseconds (if polling) */
  pollIntervalMs: z.number().int().positive().default(10_000),
})

export type JobsListConfig = z.infer<typeof jobsListConfigSchema>

/**
 * Parameters for listing jobs
 */
export const listJobsParamsSchema = z.object({
  /** Optional status filter (e.g., "pending", "running", "completed") */
  statusFilter: z.string().optional(),
})

export type ListJobsParams = z.infer<typeof listJobsParamsSchema>

/**
 * Represents a single job entry
 */
export interface JobEntry {
  id: string
  status: string
  createdAt: number
  updatedAt: number
  payload?: Record<string, unknown>
}

/**
 * Result of listing jobs
 */
export interface JobsListResult {
  jobs: JobEntry[]
  timestamp: number
}
