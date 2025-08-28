import { z } from "zod"
import fetch, { RequestInit, HeadersInit } from "node-fetch"

/* ================================================================================================
 * Configuration
 * ==============================================================================================*/

/**
 * Configuration for AIBaseService
 */
export const aiBaseConfigSchema = z.object({
  /** AI API endpoint URL */
  endpoint: z.string().url(),
  /** API key or token for authentication */
  apiKey: z.string().min(1),
  /** Default model to use */
  defaultModel: z.string().min(1).default("gpt-4"),
  /** Request timeout in milliseconds */
  timeoutMs: z.number().int().positive().default(10_000),
  /** Number of retry attempts on timeout/429/5xx/network errors (total tries = retries + 1) */
  retries: z.number().int().min(0).default(2),
  /** Deterministic linear backoff (ms) between retry attempts */
  backoffMs: z.number().int().positive().default(500),
  /** Optional default headers to merge into each request */
  extraHeaders: z.record(z.string()).optional(),
  /** Optional User-Agent override */
  userAgent: z.string().optional(),
})
export type AiBaseConfig = z.infer<typeof aiBaseConfigSchema>

/* ================================================================================================
 * Completion Parameters
 * ==============================================================================================*/

/**
 * Parameters for generating a completion
 */
export const completionParamsSchema = z.object({
  /** The prompt or input text */
  prompt: z.string().min(1),
  /** Optional override of the model */
  model: z.string().optional(),
  /** Maximum tokens to generate */
  maxTokens: z.number().int().positive().default(256),
  /** Temperature for sampling (0–1) */
  temperature: z.number().min(0).max(1).default(0.7),
  /** Optional stop sequence(s) */
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  /** Optional top_p nucleus sampling */
  topP: z.number().min(0).max(1).optional(),
})
export type CompletionParams = z.infer<typeof completionParamsSchema>

/* ================================================================================================
 * Result Types
 * ==============================================================================================*/

/**
 * Result of an AI completion request
 */
export interface CompletionResult {
  /** The generated text */
  text: string
  /** Original prompt echoed back */
  prompt: string
  /** Model used */
  model: string
  /** Timestamp of the response */
  timestamp: number
}

/* ================================================================================================
 * Errors
 * ==============================================================================================*/

export class AIBaseError extends Error {
  constructor(
    public code:
      | "VALIDATION"
      | "TIMEOUT"
      | "HTTP_ERROR"
      | "NETWORK"
      | "BAD_RESPONSE"
      | "UNKNOWN",
    message: string,
    public status?: number
  ) {
    super(message)
    this.name = "AIBaseError"
  }
}

/* ================================================================================================
 * Response Schema (tolerant to a couple of common shapes)
 * ==============================================================================================*/

const completionResponseSchema = z
  .object({ completion: z.string() })
  .or(
    z.object({
      choices: z.array(z.object({ text: z.string() })).min(1),
    })
  )

/* ================================================================================================
 * Service
 * ==============================================================================================*/

export interface GenerateOptions {
  /** External abort signal to cancel the request */
  signal?: AbortSignal
  /** Extra headers for this call only (merged on top of config.extraHeaders) */
  headers?: Record<string, string>
  /** Idempotency key header, if your API supports it */
  idempotencyKey?: string
}

export class AIBaseService {
  private endpoint: string
  private apiKey: string
  private defaultModel: string
  private timeoutMs: number
  private retries: number
  private backoffMs: number
  private extraHeaders?: Record<string, string>
  private userAgent?: string

  constructor(rawConfig: unknown) {
    const {
      endpoint,
      apiKey,
      defaultModel,
      timeoutMs,
      retries,
      backoffMs,
      extraHeaders,
      userAgent,
    } = aiBaseConfigSchema.parse(rawConfig)
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.defaultModel = defaultModel
    this.timeoutMs = timeoutMs
    this.retries = retries
    this.backoffMs = backoffMs
    this.extraHeaders = extraHeaders
    this.userAgent = userAgent
  }

  /**
   * Generate a completion from the AI endpoint.
   * Deterministic retries on network/timeout/429/5xx with linear backoff.
   */
  public async generate(params: unknown, options: GenerateOptions = {}): Promise<CompletionResult> {
    // 1) Validate input params
    const parsed = completionParamsSchema.safeParse(params)
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")
      throw new AIBaseError("VALIDATION", `Invalid completion parameters: ${msg}`)
    }
    const { prompt, model, maxTokens, temperature, stop, topP } = parsed.data
    const usedModel = model ?? this.defaultModel

    // 2) Build request body
    const body: Record<string, unknown> = {
      prompt,
      model: usedModel,
      max_tokens: maxTokens,
      temperature,
    }
    if (stop !== undefined) body.stop = stop
    if (topP !== undefined) body.top_p = topP

    // 3) Retry loop: attempts = retries + 1
    let lastError: unknown
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const result = await this.tryOnce(body, usedModel, options).catch(e => {
        lastError = e
        return undefined
      })
      if (result) return result

      // If failed and we still have attempts, backoff deterministically
      if (attempt < this.retries && isRetryable(lastError)) {
        await delay(this.backoffMs * (attempt + 1))
      } else {
        break
      }
    }

    // Exhausted
    if (lastError instanceof AIBaseError) throw lastError
    throw new AIBaseError("UNKNOWN", String(lastError ?? "Unknown error"))
  }

  private async tryOnce(
    body: Record<string, unknown>,
    usedModel: string,
    options: GenerateOptions
  ): Promise<CompletionResult> {
    // Compose headers
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      ...(this.userAgent ? { "User-Agent": this.userAgent } : {}),
      ...(this.extraHeaders ?? {}),
      ...(options.headers ?? {}),
      ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    // Compose external signal with local controller
    const onAbort = () => controller.abort()
    options.signal?.addEventListener("abort", onAbort, { once: true })

    const fetchOpts: RequestInit = {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal as any,
    }

    try {
      const res = await fetch(this.endpoint, fetchOpts)
      if (!res.ok) {
        const text = await safeText(res)
        throw new AIBaseError("HTTP_ERROR", `AI error ${res.status}: ${text}`, res.status)
      }

      const json = (await res.json()) as unknown
      const parsed = completionResponseSchema.safeParse(json)
      if (!parsed.success) {
        throw new AIBaseError(
          "BAD_RESPONSE",
          `Unexpected response shape: ${parsed.error.message}`
        )
      }

      const text =
        "completion" in parsed.data
          ? parsed.data.completion
          : parsed.data.choices[0].text

      return {
        text,
        prompt: String(body.prompt ?? ""),
        model: usedModel,
        timestamp: Date.now(),
      }
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new AIBaseError("TIMEOUT", `Request timed out after ${this.timeoutMs}ms`)
      }
      if (err instanceof AIBaseError) throw err
      // node-fetch throws FetchError (name: "FetchError") for network issues
      if (isNetworkLike(err)) {
        throw new AIBaseError("NETWORK", err.message)
      }
      throw new AIBaseError("UNKNOWN", err?.message || String(err))
    } finally {
      clearTimeout(timeout)
      options.signal?.removeEventListener("abort", onAbort)
    }
  }
}

/* ================================================================================================
 * Helpers
 * ==============================================================================================*/

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function safeText(res: any, max = 300): Promise<string> {
  try {
    const txt = await res.text()
    return txt.length <= max ? txt : txt.slice(0, max) + "…"
  } catch {
    return "<no-body>"
  }
}

function isNetworkLike(err: unknown): boolean {
  const name = (err as any)?.name
  return name === "FetchError" || name === "TypeError"
}

function isRetryable(err: unknown): boolean {
  if (err instanceof AIBaseError) {
    return (
      err.code === "NETWORK" ||
      err.code === "TIMEOUT" ||
      (err.code === "HTTP_ERROR" && typeof err.status === "number" && (err.status === 429 || (err.status >= 500 && err.status <= 599)))
    )
  }
  return false
}
