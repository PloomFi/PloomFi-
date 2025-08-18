import fetch from "node-fetch"
import { EventEmitter } from "events"
import { URL } from "url"
import {
  sendLogicConfigSchema,
  SendLogicConfig,
  logicDispatchParamsSchema,
  LogicDispatchParams,
  DispatchResult,
} from "./defineSendLogicShape"


export class SendLogicService extends EventEmitter {
  private readonly endpoint: string
  private readonly apiKey: string
  private readonly timeoutMs: number

  constructor(rawConfig: unknown) {
    super()
    const { endpoint, apiKey, timeoutMs }: SendLogicConfig =
      sendLogicConfigSchema.parse(rawConfig)
    this.endpoint = endpoint.replace(/\/+$/, "")
    this.apiKey = apiKey
    this.timeoutMs = timeoutMs
  }

 
  public async dispatch(rawParams: unknown): Promise<DispatchResult> {
    const { logicId, payload }: LogicDispatchParams =
      logicDispatchParamsSchema.parse(rawParams)

    this.emit("dispatchStart", logicId)
    const url = new URL(`${this.endpoint}/execute/${encodeURIComponent(logicId)}`)
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
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller?.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(`HTTP ${res.status}: ${res.statusText} ${text}`)
      }

      const data = await res.json()
      const result: DispatchResult = {
        logicId,
        success: true,
        response: data,
      }
      this.emit("dispatchResult", result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const result: DispatchResult = {
        logicId,
        success: false,
        error: message,
      }
      this.emit("dispatchError", result)
      return result
    }
  }
}
