export type Kind =
  | "income" | "expense"            // consumo real (entram em relatórios)
  | "transfer_in" | "transfer_out"  // entre contas: nunca receita/despesa
  | "invoice_payment"               // liquida fatura: sai da conta, NÃO é nova despesa
  | "goal_deposit" | "goal_withdraw"; // destinação de dinheiro, NÃO é despesa

export interface Tx { kind: Kind; amountCents: number; accountId: string | null; cardId?: string | null; }

// Efeito no saldo da conta. Compra no cartão (cardId, sem conta) não mexe no saldo.
export function accountDelta(t: Tx): number {
  if (t.accountId == null) return 0;
  switch (t.kind) {
    case "income": case "transfer_in": case "goal_withdraw": return t.amountCents;
    case "expense": case "transfer_out": case "invoice_payment": case "goal_deposit": return -t.amountCents;
  }
}
export const accountBalance = (initialCents: number, txs: Tx[]) =>
  txs.reduce((s, t) => s + accountDelta(t), initialCents);

// Somente 'income' e 'expense' contam em relatórios de consumo.
export const monthTotals = (txs: Tx[]) => ({
  income: txs.filter(t => t.kind === "income").reduce((s, t) => s + t.amountCents, 0),
  expense: txs.filter(t => t.kind === "expense").reduce((s, t) => s + t.amountCents, 0),
});
