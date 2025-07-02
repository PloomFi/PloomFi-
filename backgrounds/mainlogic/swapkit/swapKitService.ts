import fetch from "node-fetch"
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

/**
 * SwapKitService provides quoting and execution for token swaps.
 */
export class SwapKitService {
  private readonly config: SwapKitConfig
  private readonly connection: Connection

  constructor(rawConfig: unknown) {
    this.config = swapKitConfigSchema.parse(rawConfig)
    this.connection = new Connection(this.config.endpoint, this.config.commitment as ConfirmOptions)
  }

  /**
   * Fetch the best swap quote from external or on-chain aggregator.
   */
  public async getQuote(rawParams: unknown): Promise<SwapQuote> {
    const { inputMint, outputMint, amountIn }: QuoteParams = quoteParamsSchema.parse(rawParams)
    const url = new URL(`${this.config.endpoint}/quote`)
    url.searchParams.set("in", inputMint)
    url.searchParams.set("out", outputMint)
    url.searchParams.set("amt", amountIn.toString())
    if (this.config.apiKey) url.searchParams.set("apiKey", this.config.apiKey)

    const res = await fetch(url.toString(), { method: "GET", timeout: this.config.timeoutMs })
    if (!res.ok) throw new Error(`Quote API error ${res.status}: ${res.statusText}`)
    const data = (await res.json()) as any

    return {
      bestRoute: data.route,
      amountOut: data.amountOut,
      estimatedFee: data.fee,
      slippagePct: data.slippage,
      timestamp: Date.now(),
    }
  }

  /**
   * Execute the swap on‐chain using provided parameters.
   */
  public async executeSwap(rawParams: unknown): Promise<SwapExecution> {
    const {
      inputMint,
      outputMint,
      amountIn,
      minAmountOut,
      userAddress,
      feePayerAddress,
    }: SwapParams = swapParamsSchema.parse(rawParams)

    const userKey = new PublicKey(userAddress)
    const feePayerKey = feePayerAddress ? new PublicKey(feePayerAddress) : userKey

    // Build the swap transaction via on‐chain program (placeholder)
    const tx = new Transaction()
      // add instructions here for token approval, swap, etc.
      .add({
        keys: [],
        programId: new PublicKey(inputMint), // placeholder: real DEX program ID
        data: Buffer.alloc(0),
      })

    tx.feePayer = feePayerKey
    const { blockhash } = await this.connection.getLatestBlockhash(this.config.commitment as ConfirmOptions)
    tx.recentBlockhash = blockhash

    // In real use, send tx to wallet for signing
    const signedTx = await (tx as any).sign(userKey) as Transaction
    const signature = await this.connection.sendRawTransaction(signedTx.serialize())
    const status = await this.connection.confirmTransaction(signature, this.config.commitment as ConfirmOptions)

    // parse actual executed amounts from logs or events (placeholder values)
    const amountOut = minAmountOut
    const fee = 0

    return {
      signature,
      slot: status.value?.slot ?? -1,
      inputMint,
      outputMint,
      amountIn,
      amountOut,
      fee,
      timestamp: Date.now(),
    }
  }
}
