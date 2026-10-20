import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/finance/money";
import { monthTotals } from "@/lib/finance/balance";
import { formatDateBR, monthRange, parseMonth, qs, todayISO } from "@/lib/dates";
import { MonthNav } from "@/components/MonthNav";
import { DeleteForm } from "@/components/ui";
import { TransactionForm, type Opt, type Tx } from "../forms";
import { deleteTransaction } from "../actions";
export const metadata = { title: "Lançamentos · Meu Controle" };

export default async function Lancamentos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const mes = parseMonth(sp.mes), { start, end } = monthRange(mes);
  const tipo = sp.tipo === "income" || sp.tipo === "expense" ? sp.tipo : undefined;
  const search = (sp.q ?? "").trim().slice(0, 80);
  const supabase = await createClient();
  const [{ data: { user } }, { data: acc }, { data: cat }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("accounts").select("id,name,user_id").order("name"),
    supabase.from("categories").select("id,name,kind,user_id").order("name"),
  ]);
  const allAccounts = (acc ?? []) as (Opt & { user_id: string })[];
  const allCategories = (cat ?? []) as (Opt & { user_id: string })[];
  const accounts = allAccounts.filter((a) => a.user_id === user?.id) as Opt[];
  const categories = allCategories.filter((c) => c.user_id === user?.id) as Opt[];
  let q = supabase.from("transactions").select("id,user_id,kind,amount_cents,occurred_on,description,account_id,category_id,payment_method,notes")
    .in("kind", ["income", "expense"]).gte("occurred_on", start).lt("occurred_on", end)
    .order("occurred_on", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  if (sp.categoria) q = q.eq("category_id", sp.categoria);
  if (tipo) q = q.eq("kind", tipo);
  if (sp.conta) q = q.eq("account_id", sp.conta);
  if (search) q = q.ilike("description", "%" + search.replace(/[\\%_]/g, "\\$&") + "%");
  const { data } = await q;
  const txs = (data ?? []) as Tx[];
  const edit = sp.editar ? ((await supabase.from("transactions")
    .select("id,user_id,kind,amount_cents,occurred_on,description,account_id,category_id,payment_method,notes")
    .eq("id", sp.editar).eq("user_id", user?.id).in("kind", ["income", "expense"]).maybeSingle()).data as Tx | null) : null;
  const name = (list: Opt[], id: string | null) => list.find((x) => x.id === id)?.name;
  const totals = monthTotals(txs.map((t) => ({ kind: t.kind, amountCents: Number(t.amount_cents), accountId: t.account_id })));
  const keep = { mes, categoria: sp.categoria, tipo, conta: sp.conta, q: search || undefined };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="font-display text-3xl font-semibold">Lançamentos</h1><MonthNav mes={mes} base="/lancamentos" params={{ categoria: sp.categoria, tipo, conta: sp.conta, q: search || undefined }} /></div>
      <section className="card">
        <h2 className="mb-4 font-display text-xl font-semibold">{edit ? "Editar lançamento" : "Novo lançamento"}</h2>
        {accounts.length === 0 ? <p>Para lançar receitas e despesas, primeiro <Link href="/contas" className="font-semibold text-leaf underline">crie uma conta</Link>.</p>
          : <TransactionForm key={edit?.id ?? "new"} accounts={accounts} categories={categories} today={todayISO()} initial={edit ?? undefined} cancelHref={edit ? "/lancamentos?" + qs(keep) : undefined} />}
      </section>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="mes" value={mes} />
        <div><label htmlFor="f-q" className="label">Buscar descrição</label><input id="f-q" name="q" defaultValue={search} maxLength={80} className="input" placeholder="Ex.: mercado" /></div>
        <div><label htmlFor="f-tipo" className="label">Tipo</label><select id="f-tipo" name="tipo" defaultValue={tipo ?? ""} className="input"><option value="">Todos</option><option value="income">Receitas</option><option value="expense">Despesas</option></select></div>
        <div><label htmlFor="f-cat" className="label">Categoria</label><select id="f-cat" name="categoria" defaultValue={sp.categoria ?? ""} className="input"><option value="">Todas</option>{allCategories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.kind === "income" ? "receita" : "despesa"})</option>)}</select></div>
        <div><label htmlFor="f-conta" className="label">Conta</label><select id="f-conta" name="conta" defaultValue={sp.conta ?? ""} className="input"><option value="">Todas</option>{allAccounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
        <button className="btn-ghost">Filtrar</button>
        {(tipo || sp.categoria || sp.conta || search) && <Link href={"/lancamentos?mes=" + mes} className="py-3 text-sm font-semibold text-leaf underline">Limpar</Link>}
      </form>
      <p className="text-sm text-muted">Neste filtro: receitas <strong className="text-leaf">{formatBRL(totals.income)}</strong> · despesas <strong className="text-clay">{formatBRL(totals.expense)}</strong></p>
      <ul className="space-y-3">
        {txs.length === 0 && <li className="text-muted">Nenhum lançamento neste período.</li>}
        {txs.map((t) => (
          <li key={t.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4">
            <div className="min-w-0"><p className="truncate font-semibold">{t.description}</p><p className="text-sm text-muted">{formatDateBR(t.occurred_on)} · {name(allCategories, t.category_id) ?? "Sem categoria"} · {name(allAccounts, t.account_id) ?? "Cartão"}{t.payment_method ? " · " + t.payment_method : ""}</p></div>
            <div className="flex items-center gap-4">
              <span className={"font-display text-lg " + (t.kind === "income" ? "text-leaf" : "text-clay")}>{t.kind === "income" ? "+" : "−"}{formatBRL(Number(t.amount_cents))}</span>
              {t.user_id === user?.id ? <><Link href={"/lancamentos?" + qs({ ...keep, editar: t.id })} className="text-sm font-semibold text-leaf underline-offset-4 hover:underline">Editar</Link><DeleteForm action={deleteTransaction} id={t.id} what="este lançamento" /></> : <span className="text-xs text-muted">Compartilhado</span>}
            </div>
          </li>
        ))}
      </ul>
      {txs.length === 500 && <p className="text-sm text-muted">Mostrando os 500 mais recentes. Use os filtros para refinar.</p>}
    </div>
  );
}
