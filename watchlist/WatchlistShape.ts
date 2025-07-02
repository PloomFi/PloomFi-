import { z } from "zod"

/** Configuration for WatchlistService */
export const watchlistConfigSchema = z.object({
  /** Optional initial list of mints to watch */
  initialMints: z.array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)).optional(),
})

export type WatchlistConfig = z.infer<typeof watchlistConfigSchema>

/** Parameters to add a mint to the watchlist */
export const addMintParamsSchema = z.object({
  mint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
})

export type AddMintParams = z.infer<typeof addMintParamsSchema>

/** Parameters to remove a mint from the watchlist */
export const removeMintParamsSchema = z.object({
  mint: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint"),
})

export type RemoveMintParams = z.infer<typeof removeMintParamsSchema>

/** Result of listing current watchlist */
export interface ListResult {
  mints: string[]
}
