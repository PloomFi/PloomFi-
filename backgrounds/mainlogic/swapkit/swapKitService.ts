import fetch, { RequestInit } from "node-fetch"
import { Connection, PublicKey, Transaction, ConfirmOptions } from "@solana/web3.js"
import { z } from "zod"
import {
  swapKitConfigSchema,
  SwapKitConfig,
  quoteParamsSchema,
  QuoteParams,
  swapParamsSchema,
  SwapParams,
  SwapQuote,
  SwapExecution,
} from "./defineSwapKitShape"
import { createLogger, format, transports } from "winston"

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
  ),
  transports: [new transports.Console()],
})

const RETRY_COUNT = 2

export class SwapKitService {
  private config: SwapKitConfig
  private connection: Connection

  constructor(rawConfig: unknown) {
    const parsed = swapKitConfigSchema.safeParse(rawConfig)
    if (!parsed.success) {
      logger.error("Invalid SwapKitConfig", parsed.error.format())
      throw new Error("Invalid configuration")
    }
    this.config = parsed.data
    this.connection = new Connection(
      this.config.endpoint,
      this.config.commitment as ConfirmOptions
    )
  }

  private async fetchWithRetry(url: string, opts: RequestInit): Promise<any> {
    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
      try {
        const res = await fetch(url, opts)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
      } catch (err: any) {
        logger.warn(`Fetch attempt ${attempt} failed: ${err.message}`)
        if (attempt === RETRY_COUNT) throw err
      }
    }
  }

  public async getQuote(rawParams: unknown): Promise<SwapQuote> {
    const params = quoteParamsSchema.parse(rawParams) as QuoteParams
    const url = new URL(`${this.config.endpoint}/quote`)
    url.searchParams.set("in", params.inputMint)
    url.searchParams.set("out", params.outputMint)
    url.searchParams.set("amt", params.amountIn.toString())
    if (this.config.apiKey) url.searchParams.set("apiKey", this.config.apiKey)

    logger.info(`Requesting quote: ${url.toString()}`)
    const data = await this.fetchWithRetry(url.toString(), {
      method: "GET",
      timeout: this.config.timeoutMs,
    })

    return {
      bestRoute: data.route,
      amountOut: Number(data.amountOut),
      estimatedFee: Number(data.fee),
      slippagePct: Number(data.slippage),
      timestamp: Date.now(),
    }
  }

  public async executeSwap(rawParams: unknown): Promise<SwapExecution> {
    const { inputMint, outputMint, amountIn, minAmountOut, userAddress, feePayerAddress } =
      swapParamsSchema.parse(rawParams) as SwapParams

    const userKey = new PublicKey(userAddress)
    const feePayerKey = feePayerAddress ? new PublicKey(feePayerAddress) : userKey
    const programId = new PublicKey(this.config.programId) // from config

    // Build transaction (example uses SPL Token Program)
    const tx = new Transaction().add(
      // placeholder: replace with real instruction builder
      {
        keys: [],
        programId,
        data: Buffer.alloc(0),
      }
    )
    tx.feePayer = feePayerKey
    const { blockhash } = await this.connection.getLatestBlockhash(
      this.config.commitment as ConfirmOptions
    )
    tx.recentBlockhash = blockhash

    logger.info(`Signing transaction for ${inputMint}→${outputMint}`)
    const signedTx = await (tx as any).sign(userKey)
    const raw = signedTx.serialize()
    const signature = await this.connection.sendRawTransaction(raw)
    const confirmation = await this.connection.confirmTransaction(
      signature,
      this.config.commitment as ConfirmOptions
    )

    logger.info(`Swap executed, signature ${signature}`)
    return {
      signature,
      slot: confirmation.value?.slot ?? -1,
      inputMint,
      outputMint,
      amountIn,
      amountOut: minAmountOut, // to adjust from logs in real impl
      fee: 0,
      timestamp: Date.now(),
    }
  }
}
