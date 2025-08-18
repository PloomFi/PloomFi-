import fetch, { RequestInit, Response } from "node-fetch"
import { URL } from "url"
import { EventEmitter } from "events"
import {
  orchestratorConfigSchema,
  OrchestratorConfig,
  invokeWorkflowSchema,
  InvokeWorkflowParams,
  OrchestratorResponse
} from "./orchestratorConfig"

export type OrchestratorEvent =
  | { type: "start"; workflowId: string }
  | { type: "success"; response: OrchestratorResponse }
  | { type: "error"; response: OrchestratorResponse }

export interface OrchestratorClientOptions {
  retries?: number
  log?: (event: OrchestratorEvent) => void
}

/**
 * Client for interacting with the external orchestrator API
 * Supports timeout, retries, event emission and basic logging.
 */
export class OrchestratorClient extends EventEmitter {
  private readonly baseUrl: string
  private readonly authToken: string
  private readonly timeoutMs: number
  private readonly retries: number
  private readonly logger?: (event: OrchestratorEvent) => void

  constructor(rawConfig: unknown, opts: OrchestratorClientOptions = {}) {
    super()
    const { orchestratorUrl, authToken, requestTimeoutMs }: OrchestratorConfig =
      orchestratorConfigSchema.parse(rawConfig)

    this.baseUrl = orchestratorUrl.replace(/\/+$/, "")
    this.authToken = authToken
    this.timeoutMs = requestTimeoutMs
    this.retries = opts.retries ?? 0
    this.logger = opts.log
  }

  /**
   * Invoke a named workflow with the given payload.
   * Emits "start", "success", and "error" events.
   */
  public async invoke(rawParams: unknown): Promise<OrchestratorResponse> {
    const { workflowId, payload }: InvokeWorkflowParams =
      invokeWorkflowSchema.parse(rawParams)

    this.emit("start", workflowId)
    this.logger?.({ type: "start", workflowId })

    const url = new URL(`${this.baseUrl}/workflows/${encodeURIComponent(workflowId)}/invoke`)
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.authToken}`
    }

    let attempt = 0
    let lastError: string = "Unknown error"

    while (attempt <= this.retries) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)

      try {
        const res: Response = await fetch(url.toString(), {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!res.ok) {
          const text = await res.text().catch(() => "")
          throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`)
        }

        const data = await res.json()
        const response: OrchestratorResponse = {
          workflowId,
          success: true,
          result: data,
          timestamp: Date.now()
        }

        this.emit("success", response)
        this.logger?.({ type: "success", response })
        return response

      } catch (err) {
        clearTimeout(timeoutId)
        attempt += 1
        lastError = err instanceof Error ? err.message : String(err)

        if (attempt > this.retries) {
          const failResponse: OrchestratorResponse = {
            workflowId,
            success: false,
            error: lastError,
            timestamp: Date.now()
          }
          this.emit("error", failResponse)
          this.logger?.({ type: "error", response: failResponse })
          return failResponse
        }
      }
    }

    // Should never reach here
    return {
      workflowId,
      success: false,
      error: lastError,
      timestamp: Date.now()
    }
  }
}
