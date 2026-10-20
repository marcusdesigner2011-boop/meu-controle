"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { normalizePixLabel } from "@/lib/pix/brcode";
import type { FormState } from "../(auth)/actions";

const str = (f: FormData, key: string) => String(f.get(key) ?? "").trim();

async function adminSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=%2Fadmin");
  const { data: profile, error } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (error || profile?.is_admin !== true) redirect("/painel");
  return { supabase, user };
}

export async function saveManualPixSettings(_: FormState, form: FormData): Promise<FormState> {
  const pixKey = str(form, "pix_key");
  const holder = str(form, "pix_holder_name");
  const city = str(form, "pix_city");
  if (pixKey.length < 5 || pixKey.length > 180 || new TextEncoder().encode(pixKey).length > 77) return { error: "Informe uma chave Pix válida. Para caber no QR Pix, ela pode ter até 77 bytes." };
  if (holder.length < 2 || holder.length > 100) return { error: "Informe o nome do titular como aparece no banco." };
  if (normalizePixLabel(holder, 25).length < 2) return { error: "O nome precisa ter letras ou números para compor o QR Pix." };
  if (!city || city.length > 40 || !normalizePixLabel(city, 15)) return { error: "Informe sua cidade (até 15 caracteres no QR Pix)." };
  const { supabase, user } = await adminSession();
  const { data: updated, error } = await supabase.from("billing_settings").update({ pix_key: pixKey, pix_holder_name: holder, pix_city: normalizePixLabel(city, 15) }).eq("singleton", true).select("singleton").maybeSingle();
  if (error || !updated) return { error: "Não consegui salvar os dados Pix. Confirme que as migrations do painel e do QR Pix estão aplicadas e tente de novo." };
  await supabase.from("admin_audit").insert({ admin_id: user.id, action: "manual_pix_settings_updated", details: { holder, city: normalizePixLabel(city, 15) } });
  revalidatePath("/admin");
  revalidatePath("/assinar");
  return { ok: "Recebimento configurado. Os clientes já podem escanear o QR Pix e iniciar pedidos." };
}

export async function reviewManualPixCharge(_: FormState, form: FormData): Promise<FormState> {
  const id = str(form, "id");
  const decision = str(form, "decision");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject"].includes(decision)) return { error: "Solicitação inválida. Atualize a página e tente novamente." };
  const { supabase, user } = await adminSession();
  const { data: charge, error: readError } = await supabase.from("charges").select("id,user_id,plan,amount_cents,status,provider").eq("id", id).maybeSingle();
  if (readError || !charge || charge.provider !== "manual_pix" || charge.status !== "pending") return { error: "Este pedido não está mais aguardando revisão." };
  const expected = PLANS[charge.plan as PlanId]?.priceCents;
  if (!expected || Number(charge.amount_cents) !== expected) return { error: "O valor não corresponde ao plano cadastrado. Confira este pedido antes de aprovar." };
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase.from("charges").update({ status: decision === "approve" ? "approved" : "rejected", paid_at: decision === "approve" ? now : null }).eq("id", id).eq("status", "pending").select("id").maybeSingle();
  if (updateError || !updated) return { error: "Não consegui atualizar o pedido. Recarregue a página para conferir o estado atual." };
  const action = decision === "approve" ? "manual_pix_charge_approved" : "manual_pix_charge_rejected";
  await supabase.from("admin_audit").insert({ admin_id: user.id, target_user: charge.user_id, action, details: { charge_id: charge.id, plan: charge.plan, amount_cents: charge.amount_cents } });
  revalidatePath("/admin");
  revalidatePath("/assinar");
  revalidatePath(`/assinar/pagamento/${id}`);
  return { ok: decision === "approve" ? "Pagamento aprovado. A assinatura foi liberada por um mês." : "Pedido recusado. O acesso não foi liberado." };
}
