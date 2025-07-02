import { Connection, PublicKey } from "@solana/web3.js"
import { EventEmitter } from "events"
import {
  watchnodeConfigSchema,
  WatchnodeConfig,
  watchnodeParamsSchema,
  WatchnodeParams,
  WatchLogEvent,
} from "./watchnodeConfig"

/**
 * WatchNodeService subscribes to on-chain logs for a given address.
 */
export class WatchNodeService extends EventEmitter {
  private connection: Connection
  private commitment: WatchnodeConfig["commitment"]

  constructor(rawConfig: unknown) {
    super()
    const { endpoint, commitment }: WatchnodeConfig = watchnodeConfigSchema.parse(rawConfig)
    this.connection = new Connection(endpoint, commitment)
    this.commitment = commitment
  }

  /**
   * Start watching logs for the specified address.
   * Emits "log" events for each matching line.
   */
  public async watch(rawParams: unknown): Promise<void> {
    const { address, keywords }: WatchnodeParams = watchnodeParamsSchema.parse(rawParams)
    const key = new PublicKey(address)

    this.connection.onLogs(
      key,
      async (logInfo) => {
        const { signature, logs } = logInfo
        // attempt to resolve slot
        let slot = -1
        try {
          const status = await this.connection.getSignatureStatuses([signature], { searchTransactionHistory: true })
          slot = status.value[0]?.slot ?? -1
        } catch {
          // ignore
        }

        for (const log of logs) {
          if (!keywords || keywords.some((kw) => log.includes(kw))) {
            const evt: WatchLogEvent = { signature, slot, log }
            this.emit("log", evt)
          }
        }
      },
      this.commitment
    )
  }

  /**
   * Stop all log subscriptions.
   */
  public async stopAll(): Promise<void> {
    // There's no built-in unsubscribe-all, so recreate connection to drop listeners
    const endpoint = (this.connection.rpcEndpoint as string)
    this.connection = new Connection(endpoint, this.commitment)
  }
}
