import { EventEmitter } from "events"
import { z } from "zod"
import {
  innerLogicConfigSchema,
  InnerLogicConfig,
  innerWorkflowSchema,
  InnerWorkflow,
  LogicStep,
  StepResult,
  WorkflowExecutionResult,
} from "./defineInnerLogicShape"

/**
 * InnerLogicService orchestrates custom logic steps with retries and timeouts.
 */
export class InnerLogicService extends EventEmitter {
  private config: InnerLogicConfig

  constructor(rawConfig: unknown) {
    super()
    this.config = innerLogicConfigSchema.parse(rawConfig)
  }

  /**
   * Execute all steps in the workflow sequentially.
   */
  public async executeWorkflow(rawWorkflow: unknown): Promise<WorkflowExecutionResult> {
    const { steps }: InnerWorkflow = innerWorkflowSchema.parse(rawWorkflow)
    const results: StepResult[] = []

    for (const step of steps) {
      let attempt = 0
      let success = false
      let output: unknown
      let errorMsg: string | undefined

      while (attempt <= this.config.maxRetries && !success) {
        attempt++
        try {
          if (this.config.debug) {
            this.emit("debug", `Executing step ${step.id}, attempt ${attempt}`)
          }
          output = await this.executeStepWithTimeout(step)
          success = true
        } catch (err) {
          errorMsg = err instanceof Error ? err.message : String(err)
          this.emit("stepError", step.id, errorMsg, attempt)
          if (attempt > this.config.maxRetries) break
        }
      }

      results.push({ stepId: step.id, success, output, error: errorMsg })
      if (!success) break
    }

    const completed = results.every((r) => r.success)
    this.emit("workflowCompleted", completed, results)
    return { results, completed }
  }

  /**
   * Execute a single step, enforcing the stepTimeoutMs.
   */
  private executeStepWithTimeout(step: LogicStep): Promise<unknown> {
    const [moduleName, methodName] = step.action.split(".")
    // Dynamically import the module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(moduleName)
    const actionFn = mod[methodName]
    if (typeof actionFn !== "function") {
      return Promise.reject(new Error(`Action ${step.action} not found or not a function`))
    }

    return new Promise((resolve, reject) => {
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        reject(new Error(`Step ${step.id} timed out after ${this.config.stepTimeoutMs}ms`))
      }, this.config.stepTimeoutMs)

      Promise.resolve(actionFn(step.payload))
        .then((res) => {
          if (!timedOut) {
            clearTimeout(timer)
            resolve(res)
          }
        })
        .catch((err) => {
          if (!timedOut) {
            clearTimeout(timer)
            reject(err)
          }
        })
    })
  }
}
