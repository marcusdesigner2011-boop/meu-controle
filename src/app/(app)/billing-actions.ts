"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import type { FormState } from "../(auth)/actions";

const str = (f: FormData, key: string) => String(f.get(key) ?? "").trim();

export async function startManualPixPayment(_: FormState, form: FormData): Promise<FormState> {
  const rawPlan = str(form, "plan");
  if (!Object.hasOwn(PLANS, rawPlan)) return { error: "Escolha um plano válido." };
  const plan = rawPlan as PlanId;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/assinar?plano=${plan}`)}`);

  const { data: settings, error: settingsError } = await supabase.from("billing_settings")
    .select("pix_key,pix_holder_name,pix_city").eq("singleton", true).maybeSingle();
  if (settingsError || !settings?.pix_key?.trim() || !settings.pix_holder_name?.trim() || !settings.pix_city?.trim()) {
    return { error: "O responsável ainda precisa configurar a chave Pix, o titular e a cidade no painel administrativo." };
  }

  const { data: pending } = await supabase.from("charges").select("id,plan")
    .eq("user_id", user.id).eq("provider", "manual_pix").eq("status", "pending")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (pending?.plan === plan) redirect(`/assinar/pagamento/${pending.id}`);
  if (pending) return { error: "Você já tem um pagamento pendente. Aguarde a conferência ou fale com o responsável antes de abrir outro." };

  const { data: charge, error } = await supabase.from("charges").insert({
    user_id: user.id,
    plan,
    amount_cents: PLANS[plan].priceCents,
    status: "pending",
    provider: "manual_pix",
  }).select("id").single();
  if (error || !charge) return { error: "Não consegui iniciar seu pedido de pagamento. Tente novamente." };
  redirect(`/assinar/pagamento/${charge.id}`);
}
