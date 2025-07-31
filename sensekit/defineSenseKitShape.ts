import fetch from "node-fetch"
import { Connection, PublicKey } from "@solana/web3.js"
import { z } from "zod"
import { createLogger, format, transports } from "winston"

/** ── Schemas & Types ───────────────────────────────────────────────────── */

export const senseKitConfigSchema = z.object({
  endpoint: z.string().url(),
  commitment: z
    .enum(["processed", "confirmed", "finalized"])
    .default("confirmed"),
  sentimentApiUrl: z.string().url().optional(),
})
export type SenseKitConfig = z.infer<typeof senseKitConfigSchema>

export const monitorParamsSchema = z.object({
  address: z
    .string()
    .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 address"),
  keywords: z.array(z.string().min(1)).optional(),
})
export type MonitorParams = z.infer<typeof monitorParamsSchema>

export const sentimentParamsSchema = z.object({
  text: z.string().min(1),
})
export type SentimentParams = z.infer<typeof sentimentParamsSchema>

export interface SenseEvent {
  signature: string
  slot: number
  log: string
}

export interface SentimentResult {
  text: string
  score: number
  timestamp: number
}

/** ── Service Implementation ──────────────────────────────────────────────── */

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) =>
      `${timestamp} [${level}]: ${message}`
    )
  ),
  transports: [new transports.Console()],
})

export class SenseKitService {
  private connection: Connection
  private config: SenseKitConfig

  constructor(rawConfig: unknown) {
    this.config = senseKitConfigSchema.parse(rawConfig)
    this.connection = new Connection(
      this.config.endpoint,
      this.config.commitment
    )
    logger.info(
      `SenseKitService initialized against ${this.config.endpoint} (${this.config.commitment})`
    )
  }

  /**
   * Subscribe to program logs or account notifications
   */
  async monitorOnChain(params: unknown, onEvent: (evt: SenseEvent) => void) {
    const { address, keywords } = monitorParamsSchema.parse(params)
    const pubKey = new PublicKey(address)

    const subscriptionId = this.connection.onLogs(
      pubKey,
      (logInfo) => {
        for (const log of logInfo.logs) {
          if (!keywords || keywords.some((kw) => log.includes(kw))) {
            onEvent({
              signature: logInfo.signature,
              slot: logInfo.slot,
              log,
            })
          }
        }
      },
      this.config.commitment
    )

    logger.info(`Subscribed to logs for ${address}, id=${subscriptionId}`)
    return () => {
      this.connection.removeOnLogsListener(subscriptionId)
      logger.info(`Unsubscribed log listener ${subscriptionId}`)
    }
  }

  /**
   * Fetch sentiment score for given text
   */
  async analyzeSentiment(params: unknown): Promise<SentimentResult> {
    if (!this.config.sentimentApiUrl) {
      throw new Error("sentimentApiUrl not configured")
    }
    const { text } = sentimentParamsSchema.parse(params)
    const url = `${this.config.sentimentApiUrl}/analyze`
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const errTxt = await res.text()
        throw new Error(`HTTP ${res.status}: ${errTxt}`)
      }
      const { score } = (await res.json()) as { score: number }
      const result: SentimentResult = {
        text,
        score,
        timestamp: Date.now(),
      }
      logger.info(`Sentiment for "${text}": ${score}`)
      return result
    } catch (err: any) {
      logger.error(`Sentiment API error: ${err.message}`)
      throw err
    }
  }
}
