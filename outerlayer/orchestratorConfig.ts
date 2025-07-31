import fetch, { RequestInit } from "node-fetch"
import { z } from "zod"

/** ── Schemas & Types ───────────────────────────────────────────────────── */

export const orchestratorConfigSchema = z.object({
  orchestratorUrl: z.string().url(),
  authToken: z.string().min(1),
  requestTimeoutMs: z.number().int().positive().default(10_000),
})
export type OrchestratorConfig = z.infer<typeof orchestratorConfigSchema>

export const invokeWorkflowSchema = z.object({
  workflowId: z.string().min(1),
  payload: z.record(z.unknown()),
})
export type InvokeWorkflowParams = z.infer<typeof invokeWorkflowSchema>

export interface OrchestratorResponse {
  workflowId: string
  success: boolean
  result?: unknown
  error?: string
  timestamp: number
}

/** ── Client Implementation ──────────────────────────────────────────────── */

export class OrchestratorClient {
  private readonly baseUrl: string
  private readonly headers: Record<string, string>
  private readonly timeoutMs: number

  constructor(rawConfig: unknown) {
    const cfg = orchestratorConfigSchema.parse(rawConfig)
    this.baseUrl = cfg.orchestratorUrl.replace(/\/$/, "")
    this.headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cfg.authToken}`,
    }
    this.timeoutMs = cfg.requestTimeoutMs
  }

  private async fetchWithTimeout(url: string, init: RequestInit = {}): Promise<any> {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const resp = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(id)
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`HTTP ${resp.status}: ${text}`)
      }
      return await resp.json()
    } catch (err: any) {
      clearTimeout(id)
      if (err.name === "AbortError") {
        throw new Error(`Request to ${url} timed out after ${this.timeoutMs}ms`)
      }
      throw err
    }
  }

  /**
   * Invoke a workflow by ID with a JSON payload.
   * Returns the orchestrator’s response envelope.
   */
  async invokeWorkflow(params: unknown): Promise<OrchestratorResponse> {
    const { workflowId, payload } = invokeWorkflowSchema.parse(params)
    const url = `${this.baseUrl}/workflows/${encodeURIComponent(workflowId)}/invoke`
    const body = JSON.stringify({ payload })

    try {
      const data = await this.fetchWithTimeout(url, {
        method: "POST",
        headers: this.headers,
        body,
      })

      return {
        workflowId,
        success: data.success ?? false,
        result: data.result,
        error: data.error,
        timestamp: Date.now(),
      }
    } catch (err: any) {
      return {
        workflowId,
        success: false,
        error: err.message,
        timestamp: Date.now(),
      }
    }
  }

  /**
   * Query the status of a previously invoked workflow.
   */
  async getWorkflowStatus(workflowId: string): Promise<OrchestratorResponse> {
    if (!workflowId) {
      throw new Error("workflowId is required")
    }
    const url = `${this.baseUrl}/workflows/${encodeURIComponent(workflowId)}/status`
    try {
      const data = await this.fetchWithTimeout(url, {
        method: "GET",
        headers: this.headers,
      })
      return {
        workflowId,
        success: data.success ?? false,
        result: data.result,
        error: data.error,
        timestamp: Date.now(),
      }
    } catch (err: any) {
      return {
        workflowId,
        success: false,
        error: err.message,
        timestamp: Date.now(),
      }
    }
  }
}
