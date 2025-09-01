import { z } from "zod"

/* ---------------------------------------------
 * Common mint schema (Base58, 32–44 chars)
 * --------------------------------------------- */
export const base58MintSchema = z
  .string()
  .trim()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "invalid Base58 mint")

export type Base58Mint = z.infer<typeof base58MintSchema>

/* ---------------------------------------------
 * Configuration for WatchlistService
 * --------------------------------------------- */
export const watchlistConfigSchema = z.object({
  /** Optional initial list of mints to watch (duplicates ignored) */
  initialMints: z.array(base58MintSchema).optional().default([]),
})

export type WatchlistConfig = z.infer<typeof watchlistConfigSchema>

/* ---------------------------------------------
 * Parameters schemas
 * --------------------------------------------- */
export const addMintParamsSchema = z.object({
  /** Add a single mint */
  mint: base58MintSchema.optional(),
  /** Or add many mints at once */
  mints: z.array(base58MintSchema).optional(),
}).refine((v) => !!v.mint || (v.mints && v.mints.length > 0), {
  message: "provide `mint` or non-empty `mints`",
})

export type AddMintParams = z.infer<typeof addMintParamsSchema>

export const removeMintParamsSchema = z.object({
  /** Remove a single mint */
  mint: base58MintSchema.optional(),
  /** Or remove many mints at once */
  mints: z.array(base58MintSchema).optional(),
}).refine((v) => !!v.mint || (v.mints && v.mints.length > 0), {
  message: "provide `mint` or non-empty `mints`",
})

export type RemoveMintParams = z.infer<typeof removeMintParamsSchema>

/** Optional list query params (simple pagination) */
export const listParamsSchema = z.object({
  offset: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(500).optional().default(100),
})
export type ListParams = z.infer<typeof listParamsSchema>

/* ---------------------------------------------
 * Results
 * --------------------------------------------- */
export interface ListResult {
  mints: string[]
  count: number
}

/* ---------------------------------------------
 * WatchlistService: in-memory set with validation
 * --------------------------------------------- */
export class WatchlistService {
  private readonly set: Set<string>

  constructor(rawConfig?: unknown) {
    const cfg = watchlistConfigSchema.parse(rawConfig ?? {})
    this.set = new Set<string>(dedupe(cfg.initialMints))
  }

  /** Add mint(s). Returns the number of newly added mints. */
  add(raw: unknown): number {
    const { mint, mints } = addMintParamsSchema.parse(raw)
    const items = mint ? [mint] : (mints as string[])
    let added = 0
    for (const m of items) {
      if (!this.set.has(m)) {
        this.set.add(m)
        added++
      }
    }
    return added
  }

  /** Remove mint(s). Returns the number of actually removed mints. */
  remove(raw: unknown): number {
    const { mint, mints } = removeMintParamsSchema.parse(raw)
    const items = mint ? [mint] : (mints as string[])
    let removed = 0
    for (const m of items) {
      if (this.set.delete(m)) removed++
    }
    return removed
  }

  /** True if the mint is present */
  has(mint: string): boolean {
    base58MintSchema.parse(mint)
    return this.set.has(mint)
  }

  /** List mints with optional offset/limit */
  list(rawParams?: unknown): ListResult {
    const { offset, limit } = listParamsSchema.parse(rawParams ?? {})
    const all = Array.from(this.set)
    const slice = all.slice(offset, offset + limit)
    return { mints: slice, count: all.length }
  }

  /** Remove all mints */
  clear(): void {
    this.set.clear()
  }

  /** Current size */
  size(): number {
    return this.set.size
  }

  /** Export to a plain array (sorted for determinism) */
  export(): string[] {
    return Array.from(this.set).sort()
  }

  /** Import & merge mints (validates, dedupes). Returns newly added count. */
  import(rawMints: unknown): number {
    const arr = z.array(base58MintSchema).parse(rawMints)
    let added = 0
    for (const m of dedupe(arr)) {
      if (!this.set.has(m)) {
        this.set.add(m)
        added++
      }
    }
    return added
  }
}

/* ---------------------------------------------
 * Helpers
 * --------------------------------------------- */
function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}
