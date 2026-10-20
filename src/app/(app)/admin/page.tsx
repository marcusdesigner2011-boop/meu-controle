import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/finance/money";
import { ManualPixReviewForm, ManualPixSettingsForm } from "../admin-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração · Meu Controle" };

const date = (value?: string | null) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: ownProfile, error: authError } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (authError || !ownProfile?.is_admin) redirect("/painel");

  const [profileResult, subscriptionResult, chargeResult, settingsResult] = await Promise.all([
    supabase.from("profiles").select("id,name,email,created_at,is_admin").order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("user_id,plan,period_end,admin_override_until"),
    supabase.from("charges").select("id,user_id,plan,amount_cents,status,provider,created_at,paid_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("billing_settings").select("pix_key,pix_holder_name").eq("singleton", true).maybeSingle(),
  ]);
  if (profileResult.error || subscriptionResult.error || chargeResult.error || settingsResult.error) {
    return <section className="card space-y-2"><h1 className="font-display text-3xl font-semibold">Painel administrativo</h1><p role="alert" className="text-clay">Não consegui carregar os dados administrativos. Confira se a migração do painel foi aplicada.</p></section>;
  }
  const profiles = profileResult.data ?? [];
  const subscriptions = new Map((subscriptionResult.data ?? []).map((item) => [item.user_id, item]));
  const charges = chargeResult.data ?? [];
  const pending = charges.filter((charge) => charge.provider === "manual_pix" && charge.status === "pending");

  return <div className="space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-wide text-leaf">Área restrita</p><h1 className="mt-1 font-display text-3xl font-semibold">Painel administrativo</h1><p className="mt-2 text-muted">Clientes, planos e conferência manual dos pagamentos Pix.</p></div>

    <section className="card space-y-4">
      <div><h2 className="font-display text-xl font-semibold">Recebimento via Pix</h2><p className="mt-1 text-sm text-muted">Cadastre a chave da conta Nubank onde você vai conferir os pagamentos recebidos.</p></div>
      <ManualPixSettingsForm pixKey={settingsResult.data?.pix_key ?? ""} holder={settingsResult.data?.pix_holder_name ?? ""} />
    </section>

    <section className="card space-y-4">
      <div className="flex items-end justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">Pagamentos aguardando conferência</h2><p className="mt-1 text-sm text-muted">Confira no extrato do Nubank se o valor caiu antes de aprovar.</p></div><span className="rounded-full bg-sand px-3 py-1 text-sm font-semibold">{pending.length}</span></div>
      {pending.length === 0 ? <p className="rounded-lg bg-sand/60 p-4 text-sm text-muted">Nenhum Pix manual aguardando revisão.</p> : <div className="space-y-3">{pending.map((charge) => {
        const customer = profiles.find((profile) => profile.id === charge.user_id);
        const plan = PLANS[charge.plan as PlanId];
        return <article key={charge.id} className="rounded-xl border border-ink/10 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{customer?.name || "Cliente"}</h3><p className="text-sm text-muted">{customer?.email || "E-mail indisponível"}</p><p className="mt-1 text-sm text-muted">Plano {plan?.name ?? charge.plan} · pedido em {date(charge.created_at)}</p></div><p className="font-display text-xl font-semibold">{formatBRL(Number(charge.amount_cents))}</p></div>
          <p className="mt-2 break-all text-xs text-muted">Referência: {charge.id}</p>
          <ManualPixReviewForm id={charge.id} />
        </article>;
      })}</div>}
    </section>

    <section className="card space-y-4">
      <div><h2 className="font-display text-xl font-semibold">Clientes ({profiles.length})</h2><p className="mt-1 text-sm text-muted">Acesso e cobranças cadastradas no Meu Controle.</p></div>
      {profiles.length === 0 ? <p className="text-sm text-muted">Ainda não há clientes cadastrados.</p> : <div className="space-y-3">{profiles.map((profile) => {
        const subscription = subscriptions.get(profile.id);
        const activeUntil = [subscription?.period_end, subscription?.admin_override_until].filter(Boolean).map((value) => new Date(value as string)).sort((a, b) => b.getTime() - a.getTime())[0];
        const recentCharge = charges.find((charge) => charge.user_id === profile.id);
        return <article key={profile.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 p-4">
          <div><h3 className="font-semibold">{profile.name || "Cliente"}</h3><p className="text-sm text-muted">{profile.email || "E-mail indisponível"}</p><p className="text-xs text-muted">Cadastro: {date(profile.created_at)}</p></div>
          <div className="text-left sm:text-right"><p className="font-semibold">{activeUntil && activeUntil > new Date() ? `Acesso até ${activeUntil.toLocaleDateString("pt-BR")}` : "Sem plano ativo"}</p><p className="text-xs text-muted">{recentCharge ? `Última cobrança: ${PLANS[recentCharge.plan as PlanId]?.name ?? recentCharge.plan} · ${recentCharge.status}` : "Sem cobranças"}</p></div>
        </article>;
      })}</div>}
    </section>
  </div>;
}
