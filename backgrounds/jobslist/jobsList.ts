import { z } from "zod"

/**
 * Configuration for JobsListService
 */
export const jobsListConfigSchema = z.object({
  /** RPC/WebSocket endpoint URL for job updates */
  endpoint: z.string().url(),
  /** Poll interval in milliseconds (if polling) */
  pollIntervalMs: z.number().int().positive().default(10_000),
  /** Maximum number of jobs to keep in memory */
  maxJobs: z.number().int().positive().default(1000),
  /** Enable verbose logging */
  verbose: z.boolean().default(false),
})

export type JobsListConfig = z.infer<typeof jobsListConfigSchema>

/**
 * Parameters for listing jobs
 */
export const listJobsParamsSchema = z.object({
  /** Optional status filter (e.g., "pending", "running", "completed") */
  statusFilter: z.string().optional(),
  /** Maximum number of jobs to return */
  limit: z.number().int().positive().max(500).default(50),
  /** Return only jobs updated after this timestamp */
  updatedAfter: z.number().int().optional(),
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
  /** Priority level of the job */
  priority?: "low" | "normal" | "high"
  /** Arbitrary payload content */
  payload?: Record<string, unknown>
  /** Optional error message if job failed */
  errorMessage?: string
  /** Who created or triggered this job */
  createdBy?: string
}

/**
 * Result of listing jobs
 */
export interface JobsListResult {
  jobs: JobEntry[]
  timestamp: number
  /** Total number of jobs available (may exceed jobs.length if paginated) */
  totalCount: number
  /** Whether more jobs are available beyond this batch */
  hasMore: boolean
}
