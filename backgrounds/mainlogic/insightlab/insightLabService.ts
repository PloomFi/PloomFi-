import { Connection, PublicKey } from "@solana/web3.js"
import { EventEmitter } from "events"
import fetch from "node-fetch"
import {
  insightLabConfigSchema,
  InsightLabConfig,
  insightParamsSchema,
  InsightParams,
  InsightReport,
} from "./defineInsightLabShape"
import { AnalyzeTokenActivityService } from "./analyzeTokenActivity"
import { TokenBurstPredictor } from "./detectTokenPatterns"
import { RiskScoringService } from "./riskScoring"

export class InsightLabService extends EventEmitter {
  private conn: Connection
  private config: InsightLabConfig
  private activityService: AnalyzeTokenActivityService
  private predictor: TokenBurstPredictor
  private riskScorer: RiskScoringService

  constructor(rawConfig: unknown) {
    super()
    this.config = insightLabConfigSchema.parse(rawConfig)
    this.conn = new Connection(this.config.endpoint, this.config.commitment)
    this.activityService = new AnalyzeTokenActivityService(this.config.endpoint)
    this.predictor = new TokenBurstPredictor()
    this.riskScorer = new RiskScoringService()
  }

  /**
   * Generate a comprehensive insight report for a token.
   */
  public async generateInsight(raw: unknown): Promise<InsightReport> {
    const { mint, windowHours, buckets, detectPatterns }: InsightParams =
      insightParamsSchema.parse(raw)
    this.emit("start", mint)

    // 1) Activity heatmap
    const { matrix } = await this.activityService.generateReport({
      mint,
      windowHours,
      bucketCount: buckets,
    })

    // 2) Pattern detection
    let patternEvents
    if (detectPatterns) {
      const flatCounts = matrix.map((row) => row.reduce((a, b) => a + b, 0))
      const { burstIndices } = this.predictor.predict({
        counts: flatCounts,
        windowSize: Math.max(1, Math.floor(buckets / 4)),
        thresholdMultiplier: 2,
      })
      patternEvents = burstIndices.map((idx) => ({
        index: idx,
        type: "spike" as const,
        metric: "transfer" as const,
      }))
    }

    // 3) Risk scoring (use total volume & counts)
    const totalVolume = matrix.flat().reduce((a, b) => a + b, 0)
    const uniqueAddresses = 0 // placeholder: would fetch via on-chain
    const txCount = matrix.flat().reduce((a, b) => a + b, 0)
    const tokenAgeDays = 0 // placeholder
    const { score } = this.riskScorer.computeRisk({
      volume24h: totalVolume,
      uniqueAddresses24h: uniqueAddresses,
      txCount24h: txCount,
      tokenAgeDays,
    })

    const report: InsightReport = {
      mint,
      activityHeatmap: matrix,
      patternEvents,
      riskScore: score,
      timestamp: Date.now(),
    }

    this.emit("complete", report)
    return report
  }
}
