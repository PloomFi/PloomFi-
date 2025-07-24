type Tx = {
  id: string
  type: "send" | "receive"
  value: number
  flagged?: boolean
}

/** Classification categories */
export enum TxSeverity {
  High = "High",
  Flagged = "Flagged",
  Normal = "Normal",
}

/** Result of classification */
export interface ClassifiedTx {
  id: string
  severity: TxSeverity
}

/**
 * Classify each transaction into a severity level
 */
export function classifyTxs(txs: Tx[]): ClassifiedTx[] {
  return txs.map(({ id, value, flagged }) => {
    let severity: TxSeverity

    if (value > 10_000) {
      // highest threshold
      severity = TxSeverity.High
    } else if (flagged || value > 7_000) {
      severity = TxSeverity.Flagged
    } else {
      severity = TxSeverity.Normal
    }

    return { id, severity }
  })
}

/**
 * Mark transactions as suspicious based on value and type
 */
export function markSuspicious(txs: Tx[]): Tx[] {
  return txs.map(tx => {
    const isSuspicious =
      tx.value > 10_000 ||
      (tx.type === "send" && tx.value > 7_000)

    return { ...tx, flagged: isSuspicious }
  })
}
