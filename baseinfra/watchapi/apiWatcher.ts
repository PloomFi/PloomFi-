import fetch, { RequestInit } from "node-fetch"
import { EventEmitter } from "events"
import { z } from "zod"
import get from "lodash/get"

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
export interface ApiDataEvent<T = unknown> {
  timestamp: number
  data: T
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
   * Start polling the API. Emits:
   *  - "start"
   *  - "data" with ApiDataEvent
   *  - "error" with Error
   */
  public start(rawParams?: unknown): void {
    if (this.poller) return

    const { query } = rawParams
      ? pollParamsSchema.parse(rawParams)
      : { query: undefined }

    const buildUrl = (): string => {
      if (!query) return this.url
      const u = new URL(this.url)
      Object.entries(query).forEach(([k, v]) => u.searchParams.set(k, v))
      return u.toString()
    }

    const doFetch = async () => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.intervalMs - 100)
      try {
        const res = await fetch(buildUrl(), {
          method: "GET",
          signal: controller.signal,
        } as RequestInit)
        clearTimeout(timeout)
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        let payload = await res.json()
        if (this.jsonPath) {
          payload = get(payload, this.jsonPath)
        }
        this.emit("data", { timestamp: Date.now(), data: payload } as ApiDataEvent)
      } catch (err) {
        this.emit("error", err instanceof Error ? err : new Error(String(err)))
      }
    }

    // immediate first fetch
    this.emit("start")
    doFetch()

    this.poller = setInterval(doFetch, this.intervalMs)
  }

  /**
   * Stop polling the API. Emits "stopped"
   */
  public stop(): void {
    if (this.poller) {
      clearInterval(this.poller)
      this.poller = null
      this.emit("stopped")
    }
  }
}
