import { CryptureVaultEngine } from './cryptureVaultEngine'
import { VaultMetric } from './cryptureVaultCorrelationAnalyzer'

/**
 * CryptureVaultAgent: handles user queries and actions related to a vault contract
 */
export class CryptureVaultAgent {
  private readonly engine: CryptureVaultEngine

  constructor(apiUrl: string, apiKey: string) {
    this.engine = new CryptureVaultEngine(apiUrl, apiKey)
  }

  /**
   * Retrieves summary metrics for a contract
   */
  async getSummary(contractAddress: string, periodHours: number) {
    const data = await this.engine.fetchMetrics(contractAddress, periodHours) as VaultMetric[]
    return {
      totalVolume: data.reduce((sum, m) => sum + m.volume, 0),
      avgLiquidity: data.reduce((sum, m) => sum + m.liquidity, 0) / data.length,
      peakActive: Math.max(...data.map(m => m.activeAddresses))
    }
  }

  /**
   * Fetches raw time-series metrics
   */
  async fetchTimeSeries(contractAddress: string, periodHours: number) {
    return this.engine.fetchMetrics(contractAddress, periodHours) as VaultMetric[]
  }
}

/**
 * VaultAgentGuide: human-readable guide for using CryptureVaultAgent
 */
export const VaultAgentGuide = `
CryptureVaultAgent Guide

Overview:
  • The agent wraps CryptureVaultEngine to provide high-level operations on vault contracts

Methods:
  • getSummary(contractAddress: string, periodHours: number)
      - Returns:
          • totalVolume: sum of volume over period
          • avgLiquidity: average liquidity
          • peakActive: maximum activeAddresses

  • fetchTimeSeries(contractAddress: string, periodHours: number)
      - Returns raw array of VaultMetric objects:
          • timestamp: UNIX epoch in ms
          • volume: traded volume
          • liquidity: current liquidity
          • activeAddresses: count of distinct addresses

Usage:
  1. Instantiate:
       const agent = new CryptureVaultAgent(apiUrl, apiKey)
  2. Summary:
       const summary = await agent.getSummary('0x...', 24)
  3. Time series:
       const data = await agent.fetchTimeSeries('0x...', 168)
`
