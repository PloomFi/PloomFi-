import fetch from "node-fetch"
import { EventEmitter } from "events"
import { z } from "zod"

/**
 * Configuration for API polling
 */
const apiWatcherConfigSchema = z.object({
  /** URL to poll */
  url: z.string().url(),
  /** Poll interval in milliseconds */
  intervalMs: z.number().int().positive().default(5000),
  /** Optional JSON path to extract from response (e.g. "data.items") */
  jsonPath: z.string().optional(),
})

export type ApiWatcherConfig = z.infer<typeof apiWatcherConfigSchema>

/**
 * Parameters for a single poll invocation
 */
const pollParamsSchema = z.object({
  /** Optional query parameters to append */
  query: z.record(z.string(), z.string()).optional(),
})

export type PollParams = z.infer<typeof pollParamsSchema>

/**
 * Event payload for each successful fetch
 */
export interface ApiDataEvent {
  timestamp: number
  data: unknown
}

/**
 * Service that polls a REST API endpoint and emits data updates
 */
export class ApiWatcherService extends EventEmitter {
  private readonly url: string
  private readonly intervalMs: number
  private readonly jsonPath?: string
  private poller: NodeJS.Timeout | null = null

  constructor(rawConfig: unknown) {
    super()
    const { url, intervalMs, jsonPath }: ApiWatcherConfig =
      apiWatcherConfigSchema.parse(rawConfig)
    this.url = url
    this.intervalMs = intervalMs
    this.jsonPath = jsonPath
  }

  /**
   * Start polling the API. Emits "data" on each successful fetch.
   */
  public start(rawParams?: unknown): void {
    const { query }: PollParams = rawParams
      ? pollParamsSchema.parse(rawParams)
      : { query: undefined }

    const buildUrl = () => {
      if (!query) return this.url
      const u = new URL(this.url)
      Object.entries(query).forEach(([k, v]) => u.searchParams.set(k, v))
      return u.toString()
    }

    if (this.poller) return
    this.poller = setInterval(async () => {
      try {
        const res = await fetch(buildUrl(), { method: "GET", timeout: this.intervalMs - 100 })
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        let payload = await res.json()
        if (this.jsonPath) {
          for (const segment of this.jsonPath.split(".")) {
            if (payload == null) break
            payload = payload[segment]
          }
        }
        this.emit("data", { timestamp: Date.now(), data: payload } as ApiDataEvent)
      } catch (err) {
        this.emit("error", err)
      }
    }, this.intervalMs)

    // immediate first fetch
    ;(async () => {
      if (!this.poller) return
      this.emit("start")
    })()
  }

  /**
   * Stop polling the API.
   */
  public stop(): void {
    if (this.poller) {
      clearInterval(this.poller)
      this.poller = null
      this.emit("stopped")
    }
  }
}
