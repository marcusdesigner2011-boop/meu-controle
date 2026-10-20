/* eslint-disable @typescript-eslint/no-explicit-any */
import { accountBalance, type Kind } from "@/lib/finance/balance";
import { todayISO } from "@/lib/dates";

// O Supabase devolve no máximo 1000 linhas por consulta: paginamos para nunca calcular com dados incompletos.
export async function fetchAll<T = any>(page: (from: number, to: number) => PromiseLike<{ data: any; error: any }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

// Saldo = saldo inicial + movimentações até HOJE, usando as regras testadas em finance/balance.ts.
export async function getAccountsWithBalance(supabase: any) {
  const { data: accounts, error } = await supabase.from("accounts").select("id,user_id,name,type,initial_balance_cents").order("name");
  if (error) throw new Error(error.message);
  const txs = await fetchAll<{ account_id: string; kind: Kind; amount_cents: number }>((f, t) =>
    supabase.from("transactions").select("account_id,kind,amount_cents").not("account_id", "is", null).lte("occurred_on", todayISO()).order("id").range(f, t));
  const by = new Map<string, { kind: Kind; amountCents: number; accountId: string }[]>();
  for (const t of txs) { const l = by.get(t.account_id) ?? []; l.push({ kind: t.kind, amountCents: Number(t.amount_cents), accountId: t.account_id }); by.set(t.account_id, l); }
  return (accounts ?? []).map((a: any) => ({ ...a, initial_balance_cents: Number(a.initial_balance_cents), balance_cents: accountBalance(Number(a.initial_balance_cents), by.get(a.id) ?? []) }));
}
