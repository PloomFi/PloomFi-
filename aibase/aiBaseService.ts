import fetch from "node-fetch"
import { URL } from "url"
import { z } from "zod"
import {
  aiBaseConfigSchema,
  AiBaseConfig,
  completionParamsSchema,
  CompletionParams,
  CompletionResult,
} from "./defineAiBaseShape"

/**
 * AIBaseService handles sending prompts to an AI endpoint and returning completions.
 */
export class AiBaseService {
  private readonly endpoint: string
  private readonly apiKey: string
  private readonly defaultModel: string
  private readonly timeoutMs: number

  constructor(rawConfig: unknown) {
    const { endpoint, apiKey, defaultModel, timeoutMs }: AiBaseConfig =
      aiBaseConfigSchema.parse(rawConfig)
    this.endpoint = endpoint.replace(/\/+$/, "")
    this.apiKey = apiKey
    this.defaultModel = defaultModel
    this.timeoutMs = timeoutMs
  }

  /**
   * Generate a completion given a prompt.
   */
  public async complete(rawParams: unknown): Promise<CompletionResult> {
    const { prompt, model, maxTokens, temperature }: CompletionParams =
      completionParamsSchema.parse(rawParams)

    const url = new URL(`${this.endpoint}/v1/completions`)
    const body = {
      model: model ?? this.defaultModel,
      prompt,
      max_tokens: maxTokens,
      temperature,
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timer)

      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        throw new Error(`API error ${res.status}: ${res.statusText} ${txt}`)
      }

      const data = (await res.json()) as any
      const text = Array.isArray(data.choices) && data.choices[0]?.text
        ? data.choices[0].text
        : ""

      return {
        text,
        prompt,
        model: body.model,
        timestamp: Date.now(),
      }
    } catch (err) {
      clearTimeout(timer)
      throw err
    }
  }
}
