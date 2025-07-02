import { Connection, PublicKey } from "@solana/web3.js"
import { EventEmitter } from "events"
import fetch from "node-fetch"
import {
  senseKitConfigSchema,
  SenseKitConfig,
  monitorParamsSchema,
  MonitorParams,
  sentimentParamsSchema,
  SentimentParams,
  SenseEvent,
  SentimentResult,
} from "./defineSenseKitShape"

/**
 * SenseKitService listens for on‐chain log events and performs optional sentiment analysis.
 */
export class SenseKitService extends EventEmitter {
  private connection: Connection
  private commitment: SenseKitConfig["commitment"]
  private sentimentApiUrl?: string

  constructor(rawConfig: unknown) {
    super()
    const { endpoint, commitment, sentimentApiUrl }: SenseKitConfig =
      senseKitConfigSchema.parse(rawConfig)
    this.connection = new Connection(endpoint, commitment)
    this.commitment = commitment
    this.sentimentApiUrl = sentimentApiUrl
  }

  /**
   * Start monitoring an account or program for logs containing keywords.
   * Emits "sense" events for matching logs.
   */
  public async monitor(rawParams: unknown): Promise<void> {
    const { address, keywords }: MonitorParams = monitorParamsSchema.parse(rawParams)
    const key = new PublicKey(address)
    this.connection.onLogs(
      key,
      async (logInfo) => {
        const { signature, logs } = logInfo
        let slot = -1
        try {
          const status = await this.connection.getSignatureStatuses([signature], { searchTransactionHistory: true })
          slot = status.value[0]?.slot ?? -1
        } catch {
          // ignore
        }
        for (const log of logs) {
          if (!keywords || keywords.some((kw) => log.includes(kw))) {
            const evt: SenseEvent = { signature, slot, log }
            this.emit("sense", evt)
          }
        }
      },
      this.commitment
    )
  }

  /**
   * Analyze the sentiment of given text using external API if configured.
   * Emits "sentiment" with the analysis result.
   */
  public async analyzeSentiment(raw: unknown): Promise<SentimentResult> {
    const { text }: SentimentParams = sentimentParamsSchema.parse(raw)
    let score = 0
    if (this.sentimentApiUrl) {
      try {
        const res = await fetch(this.sentimentApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          timeout: 5000,
        })
        if (res.ok) {
          const data = (await res.json()) as { score: number }
          score = data.score
        }
      } catch {
        // fallback to neutral
      }
    }
    const result: SentimentResult = {
      text,
      score,
      timestamp: Date.now(),
    }
    this.emit("sentiment", result)
    return result
  }
}
