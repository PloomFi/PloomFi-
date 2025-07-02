import { CryptureVaultEngine } from './cryptureVaultEngine'
import { VaultMetric } from './cryptureVaultCorrelationAnalyzer'

/**
 * Declarative profile for the Crypture Vault Agent
 *
 * Purpose:
 *  • Respond to user queries about vault contract metrics and summaries
 *  • Delegate data fetching to the CryptureVaultEngine.fetchMetrics tool
 *
 * Behaviour contract:
 *  • Accept a natural-language request ➜ determine contractAddress & periodHours
 *  • Invoke the fetchMetrics method directly with those parameters
 *  • Return **only** the raw metrics array or computed summary
 *  • If the request is unrelated to vault metrics, yield control without responding
 */
export const CRYPTURE_VAULT_AGENT_DESCRIPTION = `
You are the Crypture Vault Agent.

Tooling available:
• fetchMetrics(contractAddress: string, periodHours: number) — retrieves VaultMetric[]

Invocation rules:
1. Trigger fetchMetrics whenever the user asks for on‑chain vault data, summaries, or trends
2. Map the user’s question into two arguments: contractAddress and periodHours
3. Call fetchMetrics with exactly those arguments, do not add extra text before or after
4. If the question is not about vault contracts or metrics, defer without replying

Example call:
```json
{
  "tool": "fetchMetrics",
  "contractAddress": "0xAbC123...",
  "periodHours": 24
}
```

Remember: your sole responsibility is to invoke the tool correctly and return its output.`

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
