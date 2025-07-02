import fetch from "node-fetch"
import { URL } from "url"
import { EventEmitter } from "events"
import {
  orchestratorConfigSchema,
  OrchestratorConfig,
  invokeWorkflowSchema,
  InvokeWorkflowParams,
  OrchestratorResponse,
} from "./orchestratorConfig"

/**
 * Client for interacting with the external orchestrator API
 */
export class OrchestratorClient extends EventEmitter {
  private readonly baseUrl: string
  private readonly authToken: string
  private readonly timeoutMs: number

  constructor(rawConfig: unknown) {
    super()
    const { orchestratorUrl, authToken, requestTimeoutMs }: OrchestratorConfig =
      orchestratorConfigSchema.parse(rawConfig)
    this.baseUrl = orchestratorUrl.replace(/\/+$/, "")
    this.authToken = authToken
    this.timeoutMs = requestTimeoutMs
  }

  /**
   * Invoke a named workflow with the given payload.
   * Emits "start", "success", and "error" events.
   */
  public async invoke(rawParams: unknown): Promise<OrchestratorResponse> {
    const { workflowId, payload }: InvokeWorkflowParams =
      invokeWorkflowSchema.parse(rawParams)

    this.emit("start", workflowId)
    const url = new URL(`${this.baseUrl}/workflows/${encodeURIComponent(workflowId)}/invoke`)
    let controller: AbortController | undefined
    if (this.timeoutMs) {
      controller = new AbortController()
      setTimeout(() => controller!.abort(), this.timeoutMs)
    }

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.authToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller?.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`HTTP ${res.status}: ${res.statusText} ${text}`)
      }

      const data = await res.json()
      const response: OrchestratorResponse = {
        workflowId,
        success: true,
        result: data,
        timestamp: Date.now(),
      }
      this.emit("success", response)
      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const response: OrchestratorResponse = {
        workflowId,
        success: false,
        error: message,
        timestamp: Date.now(),
      }
      this.emit("error", response)
      return response
    }
  }
}
