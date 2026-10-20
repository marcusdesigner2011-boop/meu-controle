"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseAmountCents } from "@/lib/finance/money";
import { isValidDate } from "@/lib/dates";
import { parseCsv } from "@/lib/csv";
import type { FormState } from "../(auth)/actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const MAX_CENTS = 9_999_999_999;
async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}
const refresh = () => revalidatePath("/", "layout");
const monthKey = (s: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s + "-01" : null;

export async function saveBudget(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const category_id = str(f, "category_id"), period_month = monthKey(str(f, "month"));
  const amount = parseAmountCents(str(f, "amount"));
  if (!period_month) return { error: "Escolha um mês válido." };
  if (!category_id) return { error: "Escolha uma categoria de despesa." };
  if (amount === null || amount <= 0 || amount > MAX_CENTS) return { error: "Informe um limite válido maior que zero." };
  const { data: category } = await supabase.from("categories").select("id,kind").eq("id", category_id).eq("user_id", user.id).maybeSingle();
  if (!category || category.kind !== "expense") return { error: "Escolha uma categoria de despesa sua." };
  const { error } = await supabase.from("budgets").upsert({ user_id: user.id, category_id, period_month, limit_cents: amount }, { onConflict: "user_id,category_id,period_month" });
  if (error) return { error: "Não foi possível salvar esse orçamento." };
  refresh(); return { ok: "Orçamento salvo." };
}

export async function deleteBudget(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("budgets").delete().eq("id", str(f, "id"));
  if (error) return { error: "Não foi possível excluir o orçamento." };
  refresh(); return {};
}

export async function saveGoal(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const name = str(f, "name"), target_cents = parseAmountCents(str(f, "target"));
  const monthly = str(f, "monthly") ? parseAmountCents(str(f, "monthly")) : null;
  const deadline = str(f, "deadline") || null;
  if (!name || name.length > 80) return { error: "Informe um nome para a meta (até 80 caracteres)." };
  if (target_cents === null || target_cents <= 0 || target_cents > MAX_CENTS) return { error: "Informe um valor-alvo válido." };
  if (monthly !== null && (monthly <= 0 || monthly > MAX_CENTS)) return { error: "O plano mensal precisa ser maior que zero." };
  if (deadline && !isValidDate(deadline)) return { error: "Escolha uma data válida." };
  const { error } = await supabase.from("goals").insert({ user_id: user.id, name, target_cents, monthly_plan_cents: monthly, deadline });
  if (error) return { error: "Não foi possível salvar a meta." };
  refresh(); return { ok: "Meta criada." };
}

export async function deleteGoal(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("goals").delete().eq("id", str(f, "id"));
  if (error) return { error: "Não foi possível excluir a meta." };
  refresh(); return {};
}

export async function contributeToGoal(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const goal_id = str(f, "goal_id"), account_id = str(f, "account_id"), kind = str(f, "kind");
  const amount_cents = parseAmountCents(str(f, "amount")), occurred_on = str(f, "date");
  if (kind !== "goal_deposit" && kind !== "goal_withdraw") return { error: "Escolha aporte ou retirada." };
  if (!goal_id || !account_id || amount_cents === null || amount_cents <= 0 || amount_cents > MAX_CENTS || !isValidDate(occurred_on)) return { error: "Confira valor, conta e data." };
  const { data: goal } = await supabase.from("goals").select("id,name").eq("id", goal_id).eq("user_id", user.id).maybeSingle();
  if (!goal) return { error: "Essa meta não está disponível para alteração." };
  const { error } = await supabase.from("transactions").insert({ user_id: user.id, goal_id, account_id, kind, amount_cents, occurred_on, description: (kind === "goal_deposit" ? "Aporte: " : "Retirada: ") + goal.name });
  if (error) return { error: "Não foi possível registrar o movimento da meta." };
  refresh(); return { ok: kind === "goal_deposit" ? "Aporte registrado." : "Retirada registrada." };
}

export async function saveRecurringRule(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const id = str(f, "id"), description = str(f, "description"), kind = str(f, "kind"), account_id = str(f, "account_id"), category_id = str(f, "category_id") || null;
  const amount_cents = parseAmountCents(str(f, "amount")), cadence = str(f, "cadence"), next_due_on = str(f, "next_due_on");
  if (!description || description.length > 120 || (kind !== "income" && kind !== "expense")) return { error: "Confira a descrição e o tipo." };
  if (amount_cents === null || amount_cents <= 0 || amount_cents > MAX_CENTS || !isValidDate(next_due_on)) return { error: "Confira o valor e o próximo vencimento." };
  if (!account_id || !["weekly", "monthly", "yearly"].includes(cadence)) return { error: "Escolha uma conta e uma frequência válida." };
  const { data: account } = await supabase.from("accounts").select("id").eq("id", account_id).eq("user_id", user.id).maybeSingle();
  if (!account) return { error: "Escolha uma conta sua." };
  if (category_id) {
    const { data: category } = await supabase.from("categories").select("id,kind").eq("id", category_id).eq("user_id", user.id).maybeSingle();
    if (!category || category.kind !== kind) return { error: "Escolha uma categoria do mesmo tipo." };
  }
  const row = { user_id: user.id, description, kind, amount_cents, account_id, category_id, payment_method: str(f, "payment_method") || null, cadence, next_due_on, is_active: f.get("is_active") !== "off" };
  const { error } = id
    ? await supabase.from("recurring_rules").update(row).eq("id", id).eq("user_id", user.id)
    : await supabase.from("recurring_rules").insert(row);
  if (error) return { error: "Não foi possível salvar a recorrência." };
  refresh(); return { ok: "Recorrência salva." };
}

export async function deleteRecurringRule(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("recurring_rules").delete().eq("id", str(f, "id"));
  if (error) return { error: "Não foi possível excluir a recorrência." };
  refresh(); return {};
}

export async function generateNextRecurring(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("generate_next_recurring", { p_rule_id: str(f, "id") });
  if (error) return { error: "Não foi possível lançar a próxima ocorrência. Atualize e tente novamente." };
  refresh(); return { ok: "Lançamento recorrente criado e próxima data atualizada." };
}

function normalizeDate(raw: string) {
  const s = raw.trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  const iso = br ? br[3] + "-" + br[2].padStart(2, "0") + "-" + br[1].padStart(2, "0") : s;
  return isValidDate(iso) ? iso : null;
}

export async function importTransactions(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const file = f.get("csv");
  if (!(file instanceof File) || file.size === 0 || file.size > 5_000_000) return { error: "Escolha um CSV de até 5 MB." };
  let rows: string[][];
  try { rows = parseCsv(await file.text()); } catch (e) { return { error: e instanceof Error ? e.message : "CSV inválido." }; }
  if (rows.length < 2) return { error: "O CSV precisa ter cabeçalho e ao menos uma linha." };
  if (rows.length > 1001) return { error: "Importe até 1.000 linhas por vez." };
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const required = ["date", "description", "amount", "type", "account"];
  if (!required.every((h) => headers.includes(h))) return { error: "Cabeçalhos obrigatórios: date, description, amount, type, account. category, payment_method e notes são opcionais." };
  const col = (r: string[], key: string) => r[headers.indexOf(key)]?.trim() ?? "";
  const [{ data: acc }, { data: cat }] = await Promise.all([
    supabase.from("accounts").select("id,name").eq("user_id", user.id),
    supabase.from("categories").select("id,name,kind").eq("user_id", user.id),
  ]);
  const accounts = acc ?? [], categories = cat ?? [];
  const inserts: Record<string, unknown>[] = [];
  let invalid = 0;
  for (const row of rows.slice(1)) {
    const occurred_on = normalizeDate(col(row, "date"));
    const description = col(row, "description");
    const amount_cents = parseAmountCents(col(row, "amount"));
    const kindRaw = col(row, "type").toLowerCase();
    const kind = kindRaw === "receita" ? "income" : kindRaw === "despesa" ? "expense" : kindRaw;
    const account = accounts.find((a) => a.name.toLowerCase() === col(row, "account").toLowerCase());
    const categoryName = headers.includes("category") ? col(row, "category") : "";
    const category = categoryName ? categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase() && c.kind === kind) : null;
    if (!occurred_on || !description || description.length > 120 || amount_cents === null || amount_cents <= 0 || amount_cents > MAX_CENTS || (kind !== "income" && kind !== "expense") || !account || (categoryName && !category)) { invalid++; continue; }
    const payment_method = headers.includes("payment_method") ? col(row, "payment_method") || null : null;
    const notes = headers.includes("notes") ? col(row, "notes") || null : null;
    const material = JSON.stringify([user.id, occurred_on, description, amount_cents, kind, account.id, category?.id ?? null, payment_method, notes]);
    const import_hash = createHash("sha256").update(material).digest("hex");
    inserts.push({ user_id: user.id, occurred_on, description, amount_cents, kind, account_id: account.id, category_id: category?.id ?? null, payment_method, notes, import_hash });
  }
  if (inserts.length === 0) return { error: "Nenhuma linha válida para importar (" + invalid + " inválida(s)). Confira contas, categorias e datas." };
  const { data, error } = await supabase.from("transactions").upsert(inserts, { onConflict: "user_id,import_hash", ignoreDuplicates: true }).select("id");
  if (error) return { error: "A importação falhou. Confira o arquivo e tente novamente." };
  refresh();
  const added = data?.length ?? 0, duplicates = inserts.length - added;
  return { ok: added + " lançamento(s) importado(s), " + duplicates + " duplicado(s) ignorado(s) e " + invalid + " linha(s) inválida(s) pulada(s)." };
}

export async function createFamilyGroup(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const name = str(f, "name");
  if (!name || name.length > 60) return { error: "Dê um nome ao grupo (até 60 caracteres)." };
  const { data: group, error } = await supabase.from("family_groups").insert({ owner_id: user.id, name }).select("id").single();
  if (error || !group) return { error: "Você já tem um grupo familiar ou não foi possível criá-lo." };
  const { error: memberError } = await supabase.from("family_members").insert({ group_id: group.id, user_id: user.id, role: "owner" });
  if (memberError) return { error: "O grupo foi criado, mas não consegui registrar sua participação; recarregue a página." };
  refresh(); return { ok: "Grupo familiar criado." };
}

export async function setFamilySharing(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const id = str(f, "id"), share_finances = f.get("share_finances") === "on";
  const { error } = await supabase.from("family_groups").update({ share_finances }).eq("id", id).eq("owner_id", user.id);
  if (error) return { error: "Não foi possível atualizar o compartilhamento." };
  refresh(); return { ok: share_finances ? "Suas finanças estão compartilhadas com os membros." : "O compartilhamento financeiro foi desativado." };
}

export async function addFamilyMember(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const email = str(f, "email").toLowerCase(), group_id = str(f, "group_id");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  const { error } = await supabase.rpc("family_add_member", { p_group_id: group_id, p_email: email });
  if (error) return { error: "Não foi possível adicionar a pessoa. Confira se você é responsável pelo grupo." };
  refresh(); return { ok: "Solicitação processada. A pessoa precisa ter uma conta no Meu Controle para entrar no grupo." };
}

export async function removeFamilyMember(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const email = str(f, "email").toLowerCase(), group_id = str(f, "group_id");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  const { error } = await supabase.rpc("family_remove_member", { p_group_id: group_id, p_email: email });
  if (error) return { error: "Não foi possível remover a pessoa." };
  refresh(); return { ok: "Solicitação de remoção processada." };
}
