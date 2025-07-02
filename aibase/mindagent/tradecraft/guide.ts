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
   * Retrieves summary metrics for a vault contract over a given period
   * @param contractAddress - The address of the vault contract
   * @param periodHours - Lookback window in hours
   * @returns Promise resolving to an object with totalVolume, avgLiquidity, peakActive
   */
  async getSummary(
    contractAddress: string,
    periodHours: number
  ): Promise<{ totalVolume: number; avgLiquidity: number; peakActive: number }> {
    const data = (await this.engine.fetchMetrics(
      contractAddress,
      periodHours
    )) as VaultMetric[]

    if (!data.length) {
      throw new Error('No metrics available for provided address or period')
    }

    const totalVolume = data.reduce((sum, m) => sum + m.volume, 0)
    const avgLiquidity = data.reduce((sum, m) => sum + m.liquidity, 0) / data.length
    const peakActive = Math.max(...data.map(m => m.activeAddresses))

    return { totalVolume, avgLiquidity, peakActive }
  }

  /**
   * Fetches raw time-series metrics for further analysis or visualization
   * @param contractAddress - The address of the vault contract
   * @param periodHours - Lookback window in hours
   * @returns Promise resolving to an array of VaultMetric entries
   */
  async fetchTimeSeries(
    contractAddress: string,
    periodHours: number
  ): Promise<VaultMetric[]> {
    return (await this.engine.fetchMetrics(
      contractAddress,
      periodHours
    )) as VaultMetric[]
  }
}

/**
 * VaultAgentGuide: human-readable guide for integrating and using CryptureVaultAgent
 *
 * Installation:
 *   npm install crypture-vault-sdk
 *
 * Initialization:
 *   import { CryptureVaultAgent } from 'crypture-vault-sdk'
 *   const agent = new CryptureVaultAgent('https://api.crypture.io', 'YOUR_API_KEY')
 *
 * Methods:
 *
 * 1. getSummary
 *    - Description: Computes aggregate metrics over a specified timeframe
 *    - Signature: (contractAddress: string, periodHours: number) => Promise<{ totalVolume, avgLiquidity, peakActive }>
 *    - Example:
 *        const { totalVolume, avgLiquidity, peakActive } =
 *          await agent.getSummary('0xAbC123...', 24)
 *        console.log(`24h Volume: ${totalVolume}`)
 *
 * 2. fetchTimeSeries
 *    - Description: Retrieves raw on-chain metric history
 *    - Signature: (contractAddress: string, periodHours: number) => Promise<VaultMetric[]>
 *    - Example:
 *        const metrics = await agent.fetchTimeSeries('0xAbC123...', 168)
 *        metrics.forEach(entry => console.log(entry.timestamp, entry.volume))
 *
 * VaultMetric structure:
 *   - timestamp: number (milliseconds since UNIX epoch)
 *   - volume: number (token trading volume)
 *   - liquidity: number (available liquidity)
 *   - activeAddresses: number (number of unique addresses interacting)
 *
 * Error handling:
 *   - Throws if no data is returned for summary
 *   - Network or API errors bubble up as exceptions
 *
 * Recommended usage:
 *   • Use getSummary for dashboard values or alerts
 *   • Use fetchTimeSeries for charting or deeper analytics
 *
 * Support:
 *   For issues or feature requests, open an issue at https://github.com/crypture/vault-sdk
 */
export const VaultAgentGuide = ''
