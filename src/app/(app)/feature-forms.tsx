"use client";
import { useActionState, useState } from "react";
import { Submit, Msg } from "@/components/ui";
import { parseCsv } from "@/lib/csv";
import type { FormState } from "../(auth)/actions";
import {
  addFamilyMember, createFamilyGroup, deleteRecurringRule, generateNextRecurring,
  importTransactions, removeFamilyMember, saveBudget, saveGoal, saveRecurringRule,
  setFamilySharing, contributeToGoal,
} from "./feature-actions";

export type FeatureOption = { id: string; name: string; kind?: string };
const Input = ({ label, name, type = "text", required = true, defaultValue, placeholder, hint, inputMode }: {
  label: string; name: string; type?: string; required?: boolean; defaultValue?: string;
  placeholder?: string; hint?: string; inputMode?: "decimal" | "text";
}) => (
  <label className="block">
    <span className="label">{label}</span>
    <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} inputMode={inputMode} className="input" />
    {hint && <span className="mt-1 block text-sm text-muted">{hint}</span>}
  </label>
);

export function BudgetForm({ categories, month }: { categories: FeatureOption[]; month: string }) {
  const [s, action] = useActionState(saveBudget, {});
  return <form action={action} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
    <input type="hidden" name="month" value={month} />
    <label><span className="label">Categoria</span><select name="category_id" required className="input"><option value="">Escolha</option>{categories.filter((c) => c.kind === "expense").map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <Input label="Limite mensal (R$)" name="amount" inputMode="decimal" placeholder="Ex.: 800,00" />
    <div className="md:col-span-2"><Msg s={s} /><Submit>Salvar orçamento</Submit></div>
  </form>;
}

export function GoalForm() {
  const [s, action] = useActionState(saveGoal, {});
  return <form action={action} className="grid gap-3 md:grid-cols-2">
    <Input label="Nome da meta" name="name" placeholder="Ex.: Reserva de emergência" />
    <Input label="Valor-alvo (R$)" name="target" inputMode="decimal" placeholder="Ex.: 10.000,00" />
    <Input label="Data desejada (opcional)" name="deadline" type="date" required={false} />
    <Input label="Plano mensal (opcional, R$)" name="monthly" inputMode="decimal" required={false} placeholder="Ex.: 500,00" />
    <div className="space-y-3 md:col-span-2"><Msg s={s} /><Submit>Criar meta</Submit></div>
  </form>;
}

export function GoalContributionForm({ goalId, accounts, today }: { goalId: string; accounts: FeatureOption[]; today: string }) {
  const [s, action] = useActionState(contributeToGoal, {});
  return <form action={action} className="mt-4 grid gap-2 rounded-lg bg-sand/60 p-3 md:grid-cols-4 md:items-end">
    <input type="hidden" name="goal_id" value={goalId} />
    <label><span className="label">Movimento</span><select name="kind" className="input"><option value="goal_deposit">Aporte</option><option value="goal_withdraw">Retirada</option></select></label>
    <Input label="Valor (R$)" name="amount" inputMode="decimal" placeholder="0,00" />
    <label><span className="label">Conta</span><select name="account_id" required className="input"><option value="">Escolha</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <Input label="Data" name="date" type="date" defaultValue={today} />
    <div className="space-y-2 md:col-span-4"><Msg s={s} /><Submit>Registrar movimento</Submit></div>
  </form>;
}

export function RecurringForm({ accounts, categories, today }: { accounts: FeatureOption[]; categories: FeatureOption[]; today: string }) {
  const [s, action] = useActionState(saveRecurringRule, {});
  return <form action={action} className="grid gap-3 md:grid-cols-3">
    <Input label="Descrição" name="description" placeholder="Ex.: Internet" />
    <label><span className="label">Tipo</span><select name="kind" className="input"><option value="expense">Despesa</option><option value="income">Receita</option></select></label>
    <Input label="Valor (R$)" name="amount" inputMode="decimal" placeholder="0,00" />
    <label><span className="label">Conta</span><select name="account_id" required className="input"><option value="">Escolha</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label><span className="label">Categoria (opcional)</span><select name="category_id" className="input"><option value="">Sem categoria</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.kind === "income" ? "receita" : "despesa"})</option>)}</select></label>
    <label><span className="label">Frequência</span><select name="cadence" className="input"><option value="monthly">Mensal</option><option value="weekly">Semanal</option><option value="yearly">Anual</option></select></label>
    <Input label="Próximo vencimento" name="next_due_on" type="date" defaultValue={today} />
    <Input label="Forma de pagamento (opcional)" name="payment_method" required={false} />
    <label className="flex items-center gap-2 self-end py-3"><input type="checkbox" name="is_active" defaultChecked /> Ativa</label>
    <div className="space-y-3 md:col-span-3"><Msg s={s} /><Submit>Salvar recorrência</Submit></div>
  </form>;
}

export function RecurringActions({ id }: { id: string }) {
  const [s, action] = useActionState(generateNextRecurring, {});
  const [del, deleteAction] = useActionState(deleteRecurringRule, {});
  return <div className="mt-3 flex flex-wrap items-center gap-3">
    <form action={action}><input type="hidden" name="id" value={id} /><button className="btn-ghost !px-3 !py-2 text-sm">Lançar próxima ocorrência</button></form>
    <form action={deleteAction} onSubmit={(e) => { if (!confirm("Excluir esta regra recorrente? Os lançamentos já criados serão mantidos.")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} /><button className="text-sm font-semibold text-clay underline">Excluir regra</button>
    </form>
    {(s.error || s.ok || del.error) && <Msg s={s.error ? s : del} />}
  </div>;
}

export function CsvImportForm() {
  const [s, action] = useActionState(importTransactions, {});
  const [preview, setPreview] = useState<string[][]>([]);
  const [previewError, setPreviewError] = useState("");
  async function readFile(file?: File) {
    setPreviewError(""); setPreview([]);
    if (!file) return;
    try { setPreview(parseCsv(await file.text()).slice(0, 5)); }
    catch (e) { setPreviewError(e instanceof Error ? e.message : "Não consegui ler esse CSV."); }
  }
  return <form action={action} className="space-y-4">
    <p className="text-sm text-muted">Colunas: date, description, amount, type, account. category, payment_method e notes são opcionais. Datas aceitas: AAAA-MM-DD ou DD/MM/AAAA; tipo: income/expense ou receita/despesa.</p>
    <a href="/api/import/template" className="text-sm font-semibold text-leaf underline">Baixar modelo CSV</a>
    <label className="block"><span className="label">Arquivo CSV (até 1.000 linhas)</span><input type="file" name="csv" accept=".csv,text/csv" required className="input" onChange={(e) => readFile(e.currentTarget.files?.[0])} /></label>
    {previewError && <p role="alert" className="text-sm text-clay">{previewError}</p>}
    {preview.length > 0 && <div className="overflow-x-auto"><p className="mb-2 text-sm font-semibold">Prévia (até 5 linhas)</p><table className="w-full text-left text-xs"><tbody>{preview.map((row, i) => <tr key={i} className="border-b border-ink/10">{row.slice(0, 6).map((cell, j) => <td key={j} className="max-w-48 truncate px-2 py-1">{cell}</td>)}</tr>)}</tbody></table></div>}
    <Msg s={s} /><Submit>Importar lançamentos</Submit>
  </form>;
}

export function FamilyCreateForm() {
  const [s, action] = useActionState(createFamilyGroup, {});
  return <form action={action} className="space-y-3"><Input label="Nome do grupo" name="name" defaultValue="Minha família" /><Msg s={s} /><Submit>Criar grupo</Submit></form>;
}

export function FamilyShareForm({ id, enabled }: { id: string; enabled: boolean }) {
  const [s, action] = useActionState(setFamilySharing, {});
  return <form action={action} className="space-y-3">
    <input type="hidden" name="id" value={id} />
    <label className="flex items-start gap-3"><input type="checkbox" name="share_finances" defaultChecked={enabled} className="mt-1" /><span><strong>Compartilhar minhas finanças com os membros</strong><span className="block text-sm text-muted">Eles poderão consultar suas contas, categorias, lançamentos, metas, orçamentos e recorrências. O acesso é somente leitura.</span></span></label>
    <Msg s={s} /><Submit>Salvar compartilhamento</Submit>
  </form>;
}

export function FamilyMemberForm({ groupId, remove = false }: { groupId: string; remove?: boolean }) {
  const [s, action] = useActionState(remove ? removeFamilyMember : addFamilyMember, {});
  return <form action={action} className="space-y-3">
    <input type="hidden" name="group_id" value={groupId} />
    <Input label={remove ? "E-mail da pessoa a remover" : "E-mail de quem já tem conta"} name="email" type="email" />
    <Msg s={s} /><Submit>{remove ? "Remover do grupo" : "Adicionar ao grupo"}</Submit>
  </form>;
}
