import { EventEmitter } from "events"
import { Connection, PublicKey } from "@solana/web3.js"
import {
  jobsListConfigSchema,
  JobsListConfig,
  listJobsParamsSchema,
  ListJobsParams,
  JobEntry,
  JobsListResult,
} from "./jobsList.schema"

/**
 * JobsListService fetches and emits lists of jobs, either via polling
 * or on-chain subscriptions (placeholder).
 */
export class JobsListService extends EventEmitter {
  private connection: Connection
  private config: JobsListConfig
  private timer: NodeJS.Timeout | null = null

  constructor(rawConfig: unknown) {
    super()
    this.config = jobsListConfigSchema.parse(rawConfig)
    this.connection = new Connection(this.config.endpoint, "confirmed")
  }

  /**
   * Start periodic listing of jobs. Emits "jobs" with the current list.
   */
  public startListing(rawParams?: unknown): void {
    const { statusFilter }: ListJobsParams = rawParams
      ? listJobsParamsSchema.parse(rawParams)
      : { statusFilter: undefined }

    const fetchAndEmit = async () => {
      try {
        const jobs = await this.fetchJobs(statusFilter)
        const result: JobsListResult = { jobs, timestamp: Date.now() }
        this.emit("jobs", result)
      } catch (err) {
        this.emit("error", err)
      }
    }

    if (this.timer) return
    fetchAndEmit()
    this.timer = setInterval(fetchAndEmit, this.config.pollIntervalMs)
  }

  /**
   * Stop periodic listing.
   */
  public stopListing(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  /**
   * Fetch the list of jobs, optionally filtered by status.
   * Placeholder: replace with real RPC or database query.
   */
  private async fetchJobs(statusFilter?: string): Promise<JobEntry[]> {
    // Example: fetch from a program account or external API
    // Here we mock some entries
    const now = Date.now()
    const mock: JobEntry[] = [
      { id: "job1", status: "pending", createdAt: now - 60000, updatedAt: now - 30000 },
      { id: "job2", status: "running", createdAt: now - 120000, updatedAt: now - 20000 },
      { id: "job3", status: "completed", createdAt: now - 300000, updatedAt: now - 10000 },
    ]
    return statusFilter ? mock.filter((j) => j.status === statusFilter) : mock
  }
}
