import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAll, getAccountsWithBalance } from "@/lib/data";
import { formatBRL } from "@/lib/finance/money";
import { monthTotals, type Kind } from "@/lib/finance/balance";
import { formatDateBR, monthRange, parseMonth, shiftMonth } from "@/lib/dates";
import { MonthNav } from "@/components/MonthNav";
export const metadata = { title: "Painel · Meu Controle" };
type Row = { kind: Kind; amount_cents: number; account_id: string | null; category_id: string | null; occurred_on: string; description: string };

function Delta({ cur, prev, goodWhenUp }: { cur: number; prev: number; goodWhenUp: boolean }) {
  if (prev === 0) return <span className="text-sm text-muted">sem dados no mês anterior</span>;
  const p = Math.round(((cur - prev) / prev) * 100), up = p >= 0;
  return <span className={`text-sm ${up === goodWhenUp ? "text-leaf" : "text-clay"}`}>{up ? "▲" : "▼"} {Math.abs(p)}% vs. mês anterior</span>;
}

export default async function Painel({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const mes = parseMonth(sp.mes), prev = shiftMonth(mes, -1);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [accounts, rows, { data: cats }, { data: profile }] = await Promise.all([
    getAccountsWithBalance(supabase),
    fetchAll<Row>((f, t) => supabase.from("transactions").select("kind,amount_cents,account_id,category_id,occurred_on,description").in("kind", ["income", "expense"])
      .gte("occurred_on", monthRange(prev).start).lt("occurred_on", monthRange(mes).end).order("occurred_on", { ascending: false }).order("id").range(f, t)),
    supabase.from("categories").select("id,name"),
    supabase.from("profiles").select("name").eq("id", user!.id).maybeSingle(),
  ]);
  const toTx = (r: Row) => ({ kind: r.kind, amountCents: Number(r.amount_cents), accountId: r.account_id });
  const cur = rows.filter((r) => r.occurred_on >= monthRange(mes).start), old = rows.filter((r) => r.occurred_on < monthRange(mes).start);
  const now = monthTotals(cur.map(toTx)), before = monthTotals(old.map(toTx));
  const total = accounts.reduce((s: number, a: { balance_cents: number }) => s + a.balance_cents, 0);
  const names = new Map((cats ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
  const byCat = new Map<string, number>();
  for (const r of cur.filter((r) => r.kind === "expense")) { const n = (r.category_id && names.get(r.category_id)) || "Sem categoria"; byCat.set(n, (byCat.get(n) ?? 0) + Number(r.amount_cents)); }
  const top = [...byCat].sort((a, b) => b[1] - a[1]).slice(0, 8), max = top[0]?.[1] ?? 1;
  const result = now.income - now.expense;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="font-display text-3xl font-semibold">Olá, {profile?.name || "bem-vindo"}!</h1><p className="text-muted">Seu resumo financeiro.</p></div>
        <MonthNav mes={mes} base="/painel" />
      </div>
      {accounts.length === 0 && <div className="card border-leaf/40 bg-leaf/5"><p className="font-semibold">Comece criando sua primeira conta</p><p className="mt-1 text-muted">Depois você poderá lançar receitas e despesas e ver tudo aqui. <Link href="/contas" className="font-semibold text-leaf underline">Criar conta</Link></p></div>}

      <section aria-label="Resumo" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card"><p className="text-sm text-muted">Saldo total</p><p className={`font-display text-3xl font-semibold ${total < 0 ? "text-clay" : ""}`}>{formatBRL(total)}</p><p className="text-sm text-muted">{accounts.length} conta(s), até hoje</p></div>
        <div className="card"><p className="text-sm text-muted">Receitas do mês</p><p className="font-display text-3xl font-semibold text-leaf">{formatBRL(now.income)}</p><Delta cur={now.income} prev={before.income} goodWhenUp /></div>
        <div className="card"><p className="text-sm text-muted">Despesas do mês</p><p className="font-display text-3xl font-semibold text-clay">{formatBRL(now.expense)}</p><Delta cur={now.expense} prev={before.expense} goodWhenUp={false} /></div>
        <div className="card"><p className="text-sm text-muted">Resultado do mês</p><p className={`font-display text-3xl font-semibold ${result < 0 ? "text-clay" : "text-leaf"}`}>{formatBRL(result)}</p><p className="text-sm text-muted">receitas − despesas</p></div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card"><h2 className="mb-4 font-display text-xl font-semibold">Despesas por categoria</h2>
          {top.length === 0 ? <p className="text-muted">Nenhuma despesa neste mês.</p> : (
            <ul className="space-y-3">{top.map(([n, v]) => (
              <li key={n}><div className="flex justify-between text-sm"><span>{n}</span><span className="font-semibold">{formatBRL(v)} · {Math.round((v / now.expense) * 100)}%</span></div>
                <div className="mt-1 h-2 rounded-full bg-sand"><div className="h-2 rounded-full bg-leaf" style={{ width: `${Math.max(3, (v / max) * 100)}%` }} /></div></li>))}</ul>)}
        </section>
        <section className="card"><div className="mb-4 flex items-center justify-between"><h2 className="font-display text-xl font-semibold">Últimos lançamentos</h2><Link href={`/lancamentos?mes=${mes}`} className="text-sm font-semibold text-leaf underline">Ver todos</Link></div>
          {cur.length === 0 ? <p className="text-muted">Nenhum lançamento neste mês.</p> : (
            <ul className="divide-y divide-ink/10">{cur.slice(0, 6).map((r, i) => (
              <li key={i} className="flex justify-between gap-3 py-2"><span className="min-w-0 truncate">{r.description}<span className="block text-xs text-muted">{formatDateBR(r.occurred_on)}</span></span>
                <span className={`font-semibold ${r.kind === "income" ? "text-leaf" : "text-clay"}`}>{r.kind === "income" ? "+" : "−"}{formatBRL(Number(r.amount_cents))}</span></li>))}</ul>)}
        </section>
      </div>
    </div>
  );
}
