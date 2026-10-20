// Todo valor monetário é inteiro em CENTAVOS. Nunca use float para dinheiro.
export const toCents = (reais: string | number): number => {
  const s = typeof reais === "number" ? reais.toFixed(2) : reais.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error("Valor inválido");
  return Math.round(n * 100);
};
export const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Divide sem perder centavos (parcelas): a diferença vai para a primeira parcela.
export function splitInstallments(totalCents: number, n: number): number[] {
  const base = Math.floor(totalCents / n);
  const rest = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? rest : 0));
}

// Aceita "1.234,56", "12,5", "12.50", "R$ 10". Devolve null se inválido. Negativo só com "-".
export function parseAmountCents(input: string): number | null {
  let s = input.replace(/R\$|\s/g, "");
  const neg = s.startsWith("-"); if (neg) s = s.slice(1);
  if (/^\d+\.\d{1,2}$/.test(s)) s = s.replace(".", ","); // 12.50 -> 12,50
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(s)) return null;
  const c = toCents(s);
  return neg && c ? -c : c;
}
export const centsToInput = (c: number) => (c / 100).toFixed(2).replace(".", ",");
