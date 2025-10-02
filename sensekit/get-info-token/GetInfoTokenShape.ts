import { Connection, PublicKey } from "@solana/web3.js"
import { z } from "zod"

/**
 * Configuration for GetInfoTokenService
 */
export const getInfoTokenConfigSchema = z.object({
  /** Solana RPC endpoint */
  endpoint: z.string().url(),
  /** Commitment level */
  commitment: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
})

export type GetInfoTokenConfig = z.infer<typeof getInfoTokenConfigSchema>

/**
 * Parameters for fetching token info
 */
export const getInfoTokenParamsSchema = z.object({
  /** SPL token mint address (Base58) */
  mintAddress: z
    .string()
    .min(32)
    .max(44)
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/, "invalid Base58 mint address"),
})

export type GetInfoTokenParams = z.infer<typeof getInfoTokenParamsSchema>

/**
 * Standard token information returned
 */
export interface TokenInfo {
  mint: string
  decimals: number
  supply: bigint
  isInitialized: boolean
  freezeAuthority?: string
  mintAuthority?: string
}

/**
 * Service for retrieving token mint info
 */
export class GetInfoTokenService {
  private readonly connection: Connection

  constructor(private readonly cfg: GetInfoTokenConfig) {
    this.connection = new Connection(cfg.endpoint, cfg.commitment)
  }

  /**
   * Fetch mint info for a given SPL token mint address
   */
  public async getInfo(rawParams: unknown): Promise<TokenInfo> {
    const { mintAddress }: GetInfoTokenParams = getInfoTokenParamsSchema.parse(rawParams)
    const mintPk = new PublicKey(mintAddress)
    const info = await this.connection.getParsedAccountInfo(mintPk)

    if (!info.value) {
      throw new Error(`No account found for mint ${mintAddress}`)
    }
    const parsed = (info.value.data as any)?.parsed?.info
    if (!parsed) {
      throw new Error(`Account data not in parsed format for ${mintAddress}`)
    }

    return {
      mint: mintAddress,
      decimals: parsed.decimals,
      supply: BigInt(parsed.supply ?? 0),
      isInitialized: Boolean(parsed.isInitialized),
      freezeAuthority: parsed.freezeAuthority ?? undefined,
      mintAuthority: parsed.mintAuthority ?? undefined,
    }
  }
}

/*
filename suggestions:
- get_info_token_service.ts
- token_info_service.ts
- fetch_token_info.ts
*/
