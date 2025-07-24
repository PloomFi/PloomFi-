import { z } from "zod"
import fetch, { RequestInit } from "node-fetch"

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
})
export type AiBaseConfig = z.infer<typeof aiBaseConfigSchema>

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
})
export type CompletionParams = z.infer<typeof completionParamsSchema>

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

/**
 * Service to perform AI completions against a REST API
 */
export class AIBaseService {
  private endpoint: string
  private apiKey: string
  private defaultModel: string
  private timeoutMs: number

  constructor(rawConfig: unknown) {
    const { endpoint, apiKey, defaultModel, timeoutMs } = aiBaseConfigSchema.parse(rawConfig)
    this.endpoint = endpoint
    this.apiKey = apiKey
    this.defaultModel = defaultModel
    this.timeoutMs = timeoutMs
  }

  /**
   * Generate a completion from the AI endpoint
   */
  public async generate(params: unknown): Promise<CompletionResult> {
    const { prompt, model, maxTokens, temperature } = completionParamsSchema.parse(params)
    const usedModel = model ?? this.defaultModel
    const body = {
      prompt,
      model: usedModel,
      max_tokens: maxTokens,
      temperature,
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    const fetchOpts: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }

    try {
      const res = await fetch(this.endpoint, fetchOpts)
      clearTimeout(timeout)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`AI error ${res.status}: ${text}`)
      }
      const json = await res.json() as { completion: string }
      const now = Date.now()
      return {
        text: json.completion,
        prompt,
        model: usedModel,
        timestamp: now,
      }
    } catch (err: any) {
      clearTimeout(timeout)
      throw new Error(`generate failed: ${err.message}`)
    }
  }
}
