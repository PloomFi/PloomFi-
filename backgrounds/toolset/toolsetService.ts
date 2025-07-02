import { EventEmitter } from "events"
import { z } from "zod"
import {
  toolsetConfigSchema,
  ToolsetConfig,
  toolInvokeParamsSchema,
  ToolInvokeParams,
  ToolResult,
  ToolsetSummary,
} from "./defineToolsetShape"

/**
 * ToolsetService manages and invokes a set of named tools with concurrency control.
 */
export class ToolsetService extends EventEmitter {
  private readonly tools: Set<string>
  private readonly maxConcurrent: number
  private activeCount = 0
  private queue: ToolInvokeParams[] = []

  constructor(rawConfig: unknown) {
    super()
    const { tools, maxConcurrent }: ToolsetConfig = toolsetConfigSchema.parse(rawConfig)
    this.tools = new Set(tools)
    this.maxConcurrent = maxConcurrent
  }

  /**
   * Invoke a single tool. Returns a ToolResult.
   */
  public async invokeTool(rawParams: unknown): Promise<ToolResult> {
    const { toolName, payload }: ToolInvokeParams = toolInvokeParamsSchema.parse(rawParams)
    if (!this.tools.has(toolName)) {
      return { toolName, success: false, error: `Unknown tool "${toolName}"` }
    }
    // Placeholder: actual dispatch logic would be dynamic lookup
    try {
      // Simulate tool execution
      const output = await (this as any)[`run_${toolName}`]?.(payload)
      return { toolName, success: true, output }
    } catch (err) {
      return { toolName, success: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /**
   * Queue multiple tool invocations, respecting max concurrency.
   */
  public async invokeBatch(rawParamsList: unknown[]): Promise<ToolsetSummary> {
    const results: ToolResult[] = []
    let successes = 0
    let failures = 0

    const scheduleNext = (): void => {
      if (this.queue.length === 0) return
      if (this.activeCount >= this.maxConcurrent) return
      const params = this.queue.shift()!
      this.activeCount++
      this.invokeTool(params)
        .then((res) => {
          results.push(res)
          res.success ? successes++ : failures++
          this.emit("toolComplete", res)
        })
        .catch((_) => {
          // ignore
        })
        .finally(() => {
          this.activeCount--
          scheduleNext()
        })
    }

    // initialize queue
    this.queue = rawParamsList.map((p) => toolInvokeParamsSchema.parse(p))

    // kick off initial batch
    for (let i = 0; i < this.maxConcurrent; i++) {
      scheduleNext()
    }

    // wait until all done
    await new Promise<void>((resolve) => {
      const checkDone = () => {
        if (results.length === rawParamsList.length) resolve()
        else setTimeout(checkDone, 50)
      }
      checkDone()
    })

    const summary: ToolsetSummary = {
      total: results.length,
      successes,
      failures,
      results,
    }
    this.emit("batchComplete", summary)
    return summary
  }

  /** Example placeholder tool implementations */
  private async run_echo(payload: any): Promise<any> {
    return payload
  }

  private async run_delay(payload: { ms: number; value: any }): Promise<any> {
    await new Promise((r) => setTimeout(r, payload.ms))
    return payload.value
  }
}
