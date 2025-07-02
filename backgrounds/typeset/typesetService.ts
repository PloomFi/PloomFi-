import { TypesetConfig, typesetConfigSchema, TypesetParams, typesetParamsSchema, TypesetResult } from "./defineTypesetShape"

/**
 * Service that applies basic typographic transformations:
 * • Smart quotes (“curly” quotes)
 * • Ellipsis (…) for three dots
 * • Em-dashes (—) for double hyphens
 */
export class TypesetService {
  private readonly config: TypesetConfig

  constructor(rawConfig: unknown) {
    this.config = typesetConfigSchema.parse(rawConfig)
  }

  /**
   * Perform the typesetting transformation on the input text
   */
  public typeset(raw: unknown): TypesetResult {
    const { text } = typesetParamsSchema.parse(raw)
    let output = text

    if (this.config.enableSmartQuotes) {
      // Replace straight double quotes
      output = output
        .replace(/(^|[\s\“])"(?=\S)/g, '$1“')  // opening
        .replace(/(\S)"(?=[\s\”\p{P}])/gu, '”')  // closing
      // Replace straight single quotes
      output = output
        .replace(/(^|[\s\‘])'(?=\S)/g, '$1‘')
        .replace(/(\S)'(?=[\s\’\p{P}])/gu, '’')
    }

    if (this.config.enableEllipsis) {
      output = output.replace(/\.{3}/g, '…')
    }

    if (this.config.enableEmDashes) {
      output = output.replace(/--/g, '—')
    }

    return {
      output,
      timestamp: Date.now(),
    }
  }
}
