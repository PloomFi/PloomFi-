type Tx = {
  id: string;
  type: "send" | "receive";
  value: number;
  flagged?: boolean;
};

export function classifyTxs(txs: Tx[]): string[] {
  return txs.map(tx => {
    if (tx.value > 5000) return `${tx.id}: High`;
    if (tx.flagged) return `${tx.id}: Flagged`;
    return `${tx.id}: Normal`;
  });
}

export function markSuspicious(txs: Tx[]): Tx[] {
  return txs.map(tx => ({
    ...tx,
    flagged: tx.value > 10000 || tx.type === "send" && tx.value > 7000
  }));
}
