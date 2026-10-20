"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { saveAccount, saveCategory, saveTransaction } from "./actions";
import { Field, Msg, Select, Submit } from "@/components/ui";
import { centsToInput } from "@/lib/finance/money";

export type Opt = { id: string; name: string; kind?: string };
export type Tx = { id: string; user_id: string; kind: "income" | "expense"; description: string; amount_cents: number; occurred_on: string; account_id: string | null; category_id: string | null; payment_method: string | null; notes: string | null };
const METHODS = ["Pix", "Débito", "Crédito", "Dinheiro", "Boleto", "Transferência", "Outro"];

export function TransactionForm({ accounts, categories, today, initial, cancelHref }: { accounts: Opt[]; categories: Opt[]; today: string; initial?: Tx; cancelHref?: string }) {
  const [s, a] = useActionState(saveTransaction, {});
  const [kind, setKind] = useState<"income" | "expense">(initial?.kind ?? "expense");
  return (
    <form action={a} className="grid gap-4 md:grid-cols-2">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <fieldset className="md:col-span-2">
        <legend className="label">Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["expense", "income"] as const).map((k) => (
            <label key={k} className={`cursor-pointer rounded-lg border px-4 py-3 text-center font-semibold focus-within:ring-2 focus-within:ring-leaf/40 ${kind === k ? (k === "income" ? "border-leaf bg-leaf/10 text-leafdark" : "border-clay bg-clay/10 text-clay") : "border-ink/20"}`}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />{k === "income" ? "Receita" : "Despesa"}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Descrição" name="description" defaultValue={initial?.description} />
      <Field label="Valor (R$)" name="amount" inputMode="decimal" placeholder="0,00" defaultValue={initial ? centsToInput(initial.amount_cents) : undefined} hint="Ex.: 1.250,90" />
      <Field label="Data" name="date" type="date" defaultValue={initial?.occurred_on ?? today} />
      <Select label="Conta" name="account_id" required defaultValue={initial?.account_id ?? accounts[0]?.id}>
        {accounts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </Select>
      <div key={kind}>
        <Select label="Categoria" name="category_id" defaultValue={initial?.kind === kind ? initial?.category_id ?? "" : ""}>
          <option value="">Sem categoria</option>
          {categories.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <Select label="Forma de pagamento" name="payment_method" defaultValue={initial?.payment_method ?? ""}>
        <option value="">Não informar</option>{METHODS.map((m) => <option key={m}>{m}</option>)}
      </Select>
      <Field label="Observações (opcional)" name="notes" required={false} defaultValue={initial?.notes ?? ""} />
      <div className="space-y-3 md:col-span-2"><Msg s={s} />
        <div className="flex gap-3"><Submit>{initial ? "Salvar alterações" : "Adicionar lançamento"}</Submit>{cancelHref && <Link href={cancelHref} className="btn-ghost">Cancelar</Link>}</div>
      </div>
    </form>
  );
}

export function AccountForm({ initial }: { initial?: { id: string; name: string; type: string; initial_balance_cents: number } }) {
  const [s, a] = useActionState(saveAccount, {});
  return (
    <form action={a} className="grid gap-4 md:grid-cols-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Nome da conta" name="name" defaultValue={initial?.name} placeholder="Ex.: Nubank" />
      <Select label="Tipo" name="type" required defaultValue={initial?.type ?? "Conta corrente"}>
        {["Conta corrente", "Poupança", "Dinheiro", "Carteira digital", "Outra"].map((t) => <option key={t}>{t}</option>)}
      </Select>
      <Field label="Saldo inicial (R$)" name="initial" required={false} inputMode="decimal" placeholder="0,00" defaultValue={initial ? centsToInput(initial.initial_balance_cents) : undefined} hint="Quanto havia na conta quando você começou." />
      <div className="space-y-3 md:col-span-3"><Msg s={s} />
        <div className="flex gap-3"><Submit>{initial ? "Salvar conta" : "Adicionar conta"}</Submit>{initial && <Link href="/contas" className="btn-ghost">Cancelar</Link>}</div></div>
    </form>
  );
}

export function CategoryForm({ initial }: { initial?: { id: string; name: string; kind: string } }) {
  const [s, a] = useActionState(saveCategory, {});
  return (
    <form action={a} className="grid gap-4 md:grid-cols-2">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Nome da categoria" name="name" defaultValue={initial?.name} />
      {initial ? <p className="self-end pb-3 text-sm text-muted">Tipo: {initial.kind === "income" ? "receita" : "despesa"} (não pode ser alterado)</p> : (
        <Select label="Tipo" name="kind" required defaultValue="expense"><option value="expense">Despesa</option><option value="income">Receita</option></Select>
      )}
      <div className="space-y-3 md:col-span-2"><Msg s={s} />
        <div className="flex gap-3"><Submit>{initial ? "Salvar categoria" : "Adicionar categoria"}</Submit>{initial && <Link href="/categorias" className="btn-ghost">Cancelar</Link>}</div></div>
    </form>
  );
}
