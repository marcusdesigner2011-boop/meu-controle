"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import type { FormState } from "../(auth)/actions";

const str = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
function validCpf(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (base: string, factor: number) => {
    const sum = [...base].reduce((n, d) => n + Number(d) * factor--, 0);
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };
  return digit(cpf.slice(0, 9), 10) === Number(cpf[9]) && digit(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export async function startPixPayment(_: FormState, form: FormData): Promise<FormState> {
  const rawPlan = str(form, "plan");
  if (!(rawPlan in PLANS)) return { error: "Escolha um plano válido." };
  const plan = rawPlan as PlanId;
  const cpf = str(form, "cpf").replace(/\D/g, "");
  if (!validCpf(cpf)) return { error: "Informe um CPF válido para gerar o Pix." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect(`/entrar?next=${encodeURIComponent(`/assinar?plano=${plan}`)}`);
  const accessToken = process.env.MP_ACCESS_TOKEN;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!accessToken || !process.env.MP_WEBHOOK_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "O pagamento ainda não foi habilitado pelo responsável pelo aplicativo." };
  }
  let base: URL;
  try { base = new URL(baseUrl ?? ""); } catch { return { error: "O endereço público do aplicativo ainda não está configurado." }; }
  if (base.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(base.hostname)) {
    return { error: "Para pagar com aprovação automática, o aplicativo precisa estar publicado em um endereço HTTPS." };
  }

  let admin;
  try { admin = createAdminClient(); } catch { return { error: "O pagamento ainda não foi habilitado pelo responsável pelo aplicativo." }; }
  const { data: pending } = await admin.from("charges").select("id,plan,expires_at,pix_qr,pix_copy_paste")
    .eq("user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (pending?.plan === plan && pending.pix_copy_paste && pending.expires_at && new Date(pending.expires_at) > new Date()) {
    redirect(`/assinar/pagamento/${pending.id}`);
  }
  if (pending) await admin.from("charges").update({ status: "expired" }).eq("id", pending.id).eq("status", "pending");

  const id = randomUUID();
  const amount = PLANS[plan].priceCents;
  const { error: insertError } = await admin.from("charges").insert({
    id, user_id: user.id, plan, amount_cents: amount, status: "pending", provider: "mercadopago",
  });
  if (insertError) return { error: "Não foi possível iniciar a cobrança. Tente novamente." };

  let response: Response;
  try {
    response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": id,
      },
      body: JSON.stringify({
        transaction_amount: amount / 100,
        description: `Meu Controle — Plano ${PLANS[plan].name}`,
        payment_method_id: "pix",
        payer: { email: user.email, identification: { type: "CPF", number: cpf } },
        external_reference: id,
        notification_url: `${base.origin}/api/webhooks/mercadopago`,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        metadata: { charge_id: id, user_id: user.id, plan },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    await admin.from("charges").update({ status: "rejected" }).eq("id", id);
    return { error: "Não consegui conectar ao Mercado Pago. Tente novamente." };
  }
  if (!response.ok) {
    await admin.from("charges").update({ status: "rejected" }).eq("id", id);
    return { error: "O Mercado Pago não conseguiu gerar o Pix. Confira os dados e tente novamente." };
  }

  const payment = await response.json();
  const transactionData = payment?.point_of_interaction?.transaction_data;
  if (!payment?.id || !transactionData?.qr_code || !transactionData?.qr_code_base64) {
    await admin.from("charges").update({ status: "rejected" }).eq("id", id);
    return { error: "O Mercado Pago não retornou os dados do Pix. Tente novamente." };
  }
  const expiresAt = payment.date_of_expiration ?? new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { error: saveError } = await admin.from("charges").update({
    provider_payment_id: String(payment.id),
    pix_qr: transactionData.qr_code_base64,
    pix_copy_paste: transactionData.qr_code,
    expires_at: expiresAt,
  }).eq("id", id).eq("user_id", user.id);
  if (saveError) return { error: "A cobrança foi criada, mas não consegui abrir o Pix. Recarregue e tente novamente." };
  redirect(`/assinar/pagamento/${id}`);
}
