"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import type { FormState } from "../(auth)/actions";

const str = (f: FormData, key: string) => String(f.get(key) ?? "").trim();

async function adminSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile, error } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (error || !profile?.is_admin) redirect("/painel");
  return { supabase, user };
}

export async function saveManualPixSettings(_: FormState, form: FormData): Promise<FormState> {
  const pixKey = str(form, "pix_key");
  const holder = str(form, "pix_holder_name");
  if (pixKey.length < 5 || pixKey.length > 180) return { error: "Informe uma chave Pix válida." };
  if (holder.length < 2 || holder.length > 100) return { error: "Informe o nome do titular da conta." };
  const { supabase, user } = await adminSession();
  const { error } = await supabase.from("billing_settings").update({ pix_key: pixKey, pix_holder_name: holder })
    .eq("singleton", true);
  if (error) return { error: "Não consegui salvar as informações Pix. Tente novamente." };
  await supabase.from("admin_audit").insert({ admin_id: user.id, action: "manual_pix_settings_updated", details: { holder } });
  revalidatePath("/admin");
  revalidatePath("/assinar");
  return { ok: "Chave Pix atualizada. Os clientes já podem iniciar pagamentos manuais." };
}

export async function reviewManualPixCharge(_: FormState, form: FormData): Promise<FormState> {
  const id = str(form, "id");
  const decision = str(form, "decision");
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approve", "reject"].includes(decision)) {
    return { error: "Solicitação inválida." };
  }
  const { supabase, user } = await adminSession();
  const { data: charge, error: readError } = await supabase.from("charges")
    .select("id,user_id,plan,amount_cents,status,provider").eq("id", id).maybeSingle();
  if (readError || !charge || charge.provider !== "manual_pix" || charge.status !== "pending") {
    return { error: "Este pagamento não está mais aguardando revisão." };
  }
  const expected = PLANS[charge.plan as PlanId]?.priceCents;
  if (!expected || Number(charge.amount_cents) !== expected) {
    return { error: "O valor desta cobrança não corresponde ao plano. Confira os dados antes de aprovar." };
  }
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase.from("charges").update({
    status: decision === "approve" ? "approved" : "rejected",
    paid_at: decision === "approve" ? now : null,
  }).eq("id", id).eq("status", "pending").select("id").maybeSingle();
  if (updateError || !updated) return { error: "Não consegui atualizar esta cobrança. Recarregue a página." };
  const action = decision === "approve" ? "manual_pix_charge_approved" : "manual_pix_charge_rejected";
  const { error: auditError } = await supabase.from("admin_audit").insert({
    admin_id: user.id,
    target_user: charge.user_id,
    action,
    details: { charge_id: charge.id, plan: charge.plan, amount_cents: charge.amount_cents },
  });
  revalidatePath("/admin");
  revalidatePath("/assinar");
  revalidatePath(`/assinar/pagamento/${id}`);
  if (auditError) return { ok: decision === "approve" ? "Pagamento aprovado e acesso liberado. O registro de auditoria não pôde ser salvo." : "Pagamento recusado. O registro de auditoria não pôde ser salvo." };
  return { ok: decision === "approve" ? "Pagamento aprovado e acesso liberado por um mês." : "Pagamento recusado." };
}
