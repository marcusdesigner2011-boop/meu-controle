import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAccountsWithBalance } from "@/lib/data";
import { formatBRL } from "@/lib/finance/money";
import { DeleteForm } from "@/components/ui";
import { AccountForm } from "../forms";
import { deleteAccount } from "../actions";
export const metadata = { title: "Contas · Meu Controle" };

export default async function Contas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const accounts = await getAccountsWithBalance(await createClient());
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const edit = accounts.find((a: { id: string; user_id: string }) => a.id === sp.editar && a.user_id === user?.id);
  const total = accounts.reduce((s: number, a: { balance_cents: number }) => s + a.balance_cents, 0);
  return (
    <div className="space-y-8">
      <div><h1 className="font-display text-3xl font-semibold">Contas</h1><p className="mt-1 text-muted">Onde seu dinheiro está. Saldo total: <strong className="text-ink">{formatBRL(total)}</strong></p></div>
      <section className="card"><h2 className="mb-4 font-display text-xl font-semibold">{edit ? "Editar conta" : "Nova conta"}</h2><AccountForm key={edit?.id ?? "new"} initial={edit} /></section>
      <ul className="space-y-3">
        {accounts.length === 0 && <li className="text-muted">Você ainda não tem contas. Adicione a primeira acima.</li>}
        {accounts.map((a: { id: string; user_id: string; name: string; type: string; balance_cents: number }) => (
          <li key={a.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4">
            <div><p className="font-semibold">{a.name}</p><p className="text-sm text-muted">{a.type}{a.user_id !== user?.id ? " · Compartilhada" : ""}</p></div>
            <div className="flex items-center gap-4">
              <span className={`font-display text-lg ${a.balance_cents < 0 ? "text-clay" : ""}`}>{formatBRL(a.balance_cents)}</span>
              {a.user_id === user?.id && <><Link href={`/contas?editar=${a.id}`} className="text-sm font-semibold text-leaf underline-offset-4 hover:underline">Editar</Link><DeleteForm action={deleteAccount} id={a.id} what={`a conta “${a.name}”`} /></>}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">O saldo considera o saldo inicial e os lançamentos com data até hoje.</p>
    </div>
  );
}
