import { Connection, PublicKey } from "@solana/web3.js"
import { EventEmitter } from "events"
import {
  balanceBotConfigSchema,
  BalanceBotConfig,
  trackBalanceParamsSchema,
  TrackBalanceParams,
  BalanceChangeEvent,
  BalanceCheckResult,
} from "./defineBalanceBotShape"

/**
 * BalanceBotService periodically polls wallet balances and emits events
 * when changes exceed a configured threshold.
 */
export class BalanceBotService extends EventEmitter {
  private connection: Connection
  private config: BalanceBotConfig
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private lastBalances: Map<string, number> = new Map()

  constructor(rawConfig: unknown) {
    super()
    this.config = balanceBotConfigSchema.parse(rawConfig)
    this.connection = new Connection(this.config.endpoint, this.config.commitment)
  }

  /**
   * Begin monitoring balance for the given wallet.
   * Emits "change" events when delta ≥ threshold.
   */
  public startTracking(rawParams: unknown): void {
    const { walletAddress, deltaThreshold }: TrackBalanceParams =
      trackBalanceParamsSchema.parse(rawParams)
    if (this.timers.has(walletAddress)) return

    const pubkey = new PublicKey(walletAddress)
    const poll = async () => {
      try {
        const newBal = await this.connection.getBalance(pubkey, this.config.commitment)
        const oldBal = this.lastBalances.get(walletAddress) ?? newBal
        const delta = newBal - oldBal
        if (Math.abs(delta) >= deltaThreshold) {
          const evt: BalanceChangeEvent = {
            walletAddress,
            oldBalance: oldBal,
            newBalance: newBal,
            delta,
            timestamp: Date.now(),
          }
          this.emit("change", evt)
        }
        this.lastBalances.set(walletAddress, newBal)
      } catch (err) {
        this.emit("error", err)
      }
    }

    // initial check
    poll()
    const handle = setInterval(poll, this.config.pollIntervalMs)
    this.timers.set(walletAddress, handle)
  }

  /**
   * Stop monitoring a wallet’s balance.
   */
  public stopTracking(walletAddress: string): void {
    const handle = this.timers.get(walletAddress)
    if (handle) {
      clearInterval(handle)
      this.timers.delete(walletAddress)
      this.lastBalances.delete(walletAddress)
    }
  }

  /**
   * Perform a one‐off balance check.
   */
  public async checkBalance(rawParams: unknown): Promise<BalanceCheckResult> {
    const { walletAddress }: TrackBalanceParams = trackBalanceParamsSchema.parse(rawParams)
    const pubkey = new PublicKey(walletAddress)
    const balance = await this.connection.getBalance(pubkey, this.config.commitment)
    const result: BalanceCheckResult = { walletAddress, balance, timestamp: Date.now() }
    this.emit("checked", result)
    return result
  }
}
