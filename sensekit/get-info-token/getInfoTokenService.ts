import { Connection, PublicKey } from "@solana/web3.js"
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import {
  getInfoTokenConfigSchema,
  GetInfoTokenConfig,
  getInfoTokenParamsSchema,
  GetInfoTokenParams,
  TokenInfo,
} from "./defineGetInfoTokenShape"

/**
 * Service to fetch on‐chain SPL token mint details
 */
export class GetInfoTokenService {
  private connection: Connection
  private commitment: GetInfoTokenConfig["commitment"]

  constructor(rawConfig: unknown) {
    const { endpoint, commitment }: GetInfoTokenConfig =
      getInfoTokenConfigSchema.parse(rawConfig)
    this.connection = new Connection(endpoint, commitment)
    this.commitment = commitment
  }

  /**
   * Retrieve token mint information
   */
  public async getTokenInfo(rawParams: unknown): Promise<TokenInfo> {
    const { mintAddress }: GetInfoTokenParams =
      getInfoTokenParamsSchema.parse(rawParams)
    const mintPubkey = new PublicKey(mintAddress)
    const token = new Token(
      this.connection,
      mintPubkey,
      TOKEN_PROGRAM_ID,
      null as any
    )
    const mintAcct = await token.getMintInfo()

    return {
      mint: mintAddress,
      decimals: mintAcct.decimals,
      supply: mintAcct.supply,            // BigInt
      isInitialized: mintAcct.isInitialized,
      freezeAuthority: mintAcct.freezeAuthority?.toBase58() ?? undefined,
      mintAuthority: mintAcct.mintAuthority?.toBase58() ?? undefined,
    }
  }
}
