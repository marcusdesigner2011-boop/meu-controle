"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAmountCents } from "@/lib/finance/money";
import { isValidDate } from "@/lib/dates";
import type { FormState } from "../(auth)/actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const MAX = 9_999_999_999; // R$ 99.999.999,99
const ACCOUNT_TYPES = ["Conta corrente", "Poupança", "Dinheiro", "Carteira digital", "Outra"];
const GENERIC = "Não foi possível salvar. Verifique os dados e tente de novo.";

async function ctx() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}
const refresh = () => revalidatePath("/", "layout");

export async function saveTransaction(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const id = str(f, "id"), kind = str(f, "kind"), description = str(f, "description"), date = str(f, "date");
  if (kind !== "income" && kind !== "expense") return { error: "Escolha receita ou despesa." };
  if (!description || description.length > 120) return { error: "Descreva o lançamento (até 120 caracteres)." };
  const amount = parseAmountCents(str(f, "amount"));
  if (amount === null || amount <= 0 || amount > MAX) return { error: "Informe um valor válido maior que zero. Ex.: 1.250,90" };
  if (!isValidDate(date)) return { error: "Data inválida." };
  const account_id = str(f, "account_id"), category_id = str(f, "category_id") || null;
  if (!account_id) return { error: "Escolha a conta. Se ainda não tem, crie uma em “Contas”." };
  if (category_id) {
    const { data: c } = await supabase.from("categories").select("kind").eq("id", category_id).maybeSingle();
    if (!c || c.kind !== kind) return { error: "A categoria não combina com o tipo escolhido." };
  }
  const row = { kind, description, amount_cents: amount, occurred_on: date, account_id, category_id, payment_method: str(f, "payment_method") || null, notes: str(f, "notes") || null };
  const { error } = id
    ? await supabase.from("transactions").update(row).eq("id", id).in("kind", ["income", "expense"])
    : await supabase.from("transactions").insert({ ...row, user_id: user.id });
  if (error) return { error: GENERIC };
  refresh();
  if (id) redirect(`/lancamentos?mes=${date.slice(0, 7)}`);
  return { ok: "Lançamento salvo!" };
}

export async function deleteTransaction(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("transactions").delete().eq("id", str(f, "id")).in("kind", ["income", "expense"]);
  if (error) return { error: "Não foi possível excluir." };
  refresh(); return {};
}

export async function saveAccount(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const id = str(f, "id"), name = str(f, "name"), type = str(f, "type");
  if (!name || name.length > 60) return { error: "Informe o nome da conta (até 60 caracteres)." };
  if (!ACCOUNT_TYPES.includes(type)) return { error: "Escolha o tipo da conta." };
  const initial = str(f, "initial") === "" ? 0 : parseAmountCents(str(f, "initial"));
  if (initial === null || Math.abs(initial) > MAX) return { error: "Saldo inicial inválido. Ex.: 1.500,00" };
  const row = { name, type, initial_balance_cents: initial };
  const { error } = id ? await supabase.from("accounts").update(row).eq("id", id) : await supabase.from("accounts").insert({ ...row, user_id: user.id });
  if (error) return { error: GENERIC };
  refresh();
  if (id) redirect("/contas");
  return { ok: "Conta salva!" };
}

export async function deleteAccount(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("accounts").delete().eq("id", str(f, "id"));
  if (error) return { error: error.code === "23503" ? "Esta conta tem lançamentos e não pode ser excluída." : "Não foi possível excluir." };
  refresh(); return {};
}

export async function saveCategory(_: FormState, f: FormData): Promise<FormState> {
  const { supabase, user } = await ctx();
  const id = str(f, "id"), name = str(f, "name"), kind = str(f, "kind");
  if (!name || name.length > 40) return { error: "Informe o nome da categoria (até 40 caracteres)." };
  if (!id && kind !== "income" && kind !== "expense") return { error: "Escolha se é de receita ou de despesa." };
  const { error } = id ? await supabase.from("categories").update({ name }).eq("id", id) : await supabase.from("categories").insert({ name, kind, user_id: user.id });
  if (error) return { error: GENERIC };
  refresh();
  if (id) redirect("/categorias");
  return { ok: "Categoria salva!" };
}

export async function deleteCategory(_: FormState, f: FormData): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("categories").delete().eq("id", str(f, "id"));
  if (error) return { error: error.code === "23503" ? "Esta categoria está em uso em lançamentos." : "Não foi possível excluir." };
  refresh(); return {};
}
