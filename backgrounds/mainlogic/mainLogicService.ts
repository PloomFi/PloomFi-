import { EventEmitter } from "events"
import { z } from "zod"

/**
 * Configuration for MainLogicService
 */
const mainLogicConfigSchema = z.object({
  /** List of named modules to load */
  modules: z.array(z.string().min(1)).min(1),
  /** Default timeout for each module invocation (ms) */
  timeoutMs: z.number().int().positive().default(10_000),
})

export type MainLogicConfig = z.infer<typeof mainLogicConfigSchema>

/**
 * Parameters for invoking a module’s action
 */
const invokeParamsSchema = z.object({
  /** Module name (must be in config.modules) */
  module: z.string().min(1),
  /** Method name on the module */
  method: z.string().min(1),
  /** Payload to pass into the method */
  payload: z.record(z.unknown()),
})

export type InvokeParams = z.infer<typeof invokeParamsSchema>

/**
 * Result of a single invocation
 */
export interface InvokeResult {
  module: string
  method: string
  success: boolean
  output?: unknown
  error?: string
}

/**
 * MainLogicService dynamically loads configured modules and
 * invokes specified methods with timeout and error handling.
 */
export class MainLogicService extends EventEmitter {
  private readonly modules: Set<string>
  private readonly timeoutMs: number

  constructor(rawConfig: unknown) {
    super()
    const { modules, timeoutMs }: MainLogicConfig = mainLogicConfigSchema.parse(rawConfig)
    this.modules = new Set(modules)
    this.timeoutMs = timeoutMs
  }

  /**
   * Invoke a specific method on a module with a payload.
   * Emits "start", "result", and "error" events.
   */
  public async invoke(rawParams: unknown): Promise<InvokeResult> {
    const { module, method, payload }: InvokeParams = invokeParamsSchema.parse(rawParams)

    if (!this.modules.has(module)) {
      const err = `Module "${module}" not registered`
      this.emit("error", { module, method, error: err })
      return { module, method, success: false, error: err }
    }

    this.emit("start", { module, method })

    // Dynamically require the module
    let mod: any
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mod = require(module)
    } catch (e) {
      const err = `Failed to load module "${module}": ${(e as Error).message}`
      this.emit("error", { module, method, error: err })
      return { module, method, success: false, error: err }
    }

    const fn = mod[method]
    if (typeof fn !== "function") {
      const err = `Method "${method}" not found on module "${module}"`
      this.emit("error", { module, method, error: err })
      return { module, method, success: false, error: err }
    }

    // Execute with timeout
    const resultPromise = Promise.resolve(fn(payload))
    const timeoutPromise = new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`Invocation timed out after ${this.timeoutMs}ms`)), this.timeoutMs)
    )

    try {
      const output = await Promise.race([resultPromise, timeoutPromise])
      const res: InvokeResult = { module, method, success: true, output }
      this.emit("result", res)
      return res
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e)
      const res: InvokeResult = { module, method, success: false, error: errMsg }
      this.emit("error", res)
      return res
    }
  }
}
