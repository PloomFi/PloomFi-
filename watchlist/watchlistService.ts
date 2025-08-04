import { traceTokenDistribution } from "../routines/background-jobs/token-flow/traceTokenDistribution"
import { sendAlert } from "../services/alertService"  // hypothetical alert sender

export interface WhaleDistributionResult {
  [wallet: string]: {
    distributionPct: number
    txCount: number
  }
}

export async function runWhaleDistributionCheck(
  notify: boolean = true
): Promise<WhaleDistributionResult | null> {
  const start = new Date()
  console.info(`[WhaleCheck] ▶️ Started distribution check at ${start.toISOString()}`)

  let result: WhaleDistributionResult | null = null
  try {
    result = await traceTokenDistribution()

    if (!result || Object.keys(result).length === 0) {
      console.info("[WhaleCheck] ℹ️ No whale distribution patterns detected.")
    } else {
      const formatted = JSON.stringify(result, null, 2)
      console.info(`[WhaleCheck] 🐋 Distribution detected:\n${formatted}`)
      if (notify) {
        await sendAlert({
          subject: "Whale Distribution Alert",
          message: `Detected whale distribution patterns at ${new Date().toISOString()}:\n${formatted}`,
        })
      }
    }
  } catch (err: any) {
    console.error("[WhaleCheck] ❌ Error during distribution trace:", err)
    if (notify) {
      await sendAlert({
        subject: "Whale Distribution Error",
        message: `Error during whale distribution check at ${new Date().toISOString()}:\n${err.stack || err}`,
      })
    }
  } finally {
    const end = new Date()
    const duration = ((end.getTime() - start.getTime()) / 1000).toFixed(2)
    console.info(`[WhaleCheck] ✅ Completed at ${end.toISOString()} (took ${duration}s)`)
  }

  return result
}
