import { CryptureVaultEngine } from './cryptureVaultEngine'

export interface VaultMetric {
  timestamp: number
  volume: number
  liquidity: number
  activeAddresses: number
}

export interface CorrelationResult {
  pair: readonly [keyof VaultMetric, keyof VaultMetric]
  coefficient: number
}

/**
 * Computes Pearson correlation between two numeric arrays of equal length
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length
  if (n === 0 || y.length !== n) return 0

  const meanX = x.reduce((sum, val) => sum + val, 0) / n
  const meanY = y.reduce((sum, val) => sum + val, 0) / n

  let numerator = 0
  let denomX = 0
  let denomY = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    numerator += dx * dy
    denomX += dx * dx
    denomY += dy * dy
  }

  const denominator = Math.sqrt(denomX * denomY)
  return denominator === 0 ? 0 : numerator / denominator
}

/**
 * VaultCorrelationAnalyzer fetches on-chain metrics from CryptureVaultEngine
 * and computes pairwise Pearson correlations between volume, liquidity,
 * and activeAddresses
 */
export class VaultCorrelationAnalyzer {
  private readonly vaultEngine: CryptureVaultEngine

  constructor(apiUrl: string, apiKey: string) {
    this.vaultEngine = new CryptureVaultEngine(apiUrl, apiKey)
  }

  /**
   * Fetches metrics for a given contract over a period and
   * returns correlation coefficients for each metric pair
   */
  async analyze(
    contractAddress: string,
    periodHours: number
  ): Promise<CorrelationResult[]> {
    const data = (await this.vaultEngine.fetchMetrics(
      contractAddress,
      periodHours
    )) as VaultMetric[]

    if (data.length === 0) {
      return []
    }

    // extract series for each metric
    const volumeSeries = data.map(entry => entry.volume)
    const liquiditySeries = data.map(entry => entry.liquidity)
    const activeSeries = data.map(entry => entry.activeAddresses)

    const pairs: Array<readonly [keyof VaultMetric, number[]]> = [
      ['volume', volumeSeries],
      ['liquidity', liquiditySeries],
      ['activeAddresses', activeSeries],
    ]

    const results: CorrelationResult[] = []

    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [keyA, seriesA] = pairs[i]
        const [keyB, seriesB] = pairs[j]
        const coefficient = pearsonCorrelation(seriesA, seriesB)
        results.push({ pair: [keyA, keyB], coefficient })
      }
    }

    return results
  }
}
