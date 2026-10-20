import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/finance/money";
import { ManualPixReviewForm, ManualPixSettingsForm } from "./admin-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração · Meu Controle" };

const date = (value?: string | null) => value ? new Date(value).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" }) : "—";
const statusLabel: Record<string, string> = { pending: "Aguardando", approved: "Confirmado", rejected: "Recusado", cancelled: "Cancelado", refunded: "Estornado", expired: "Expirado" };
const auditLabels: Record<string, string> = { manual_pix_charge_approved: "Pagamento Pix aprovado", manual_pix_charge_rejected: "Pagamento Pix recusado", manual_pix_settings_updated: "Dados de recebimento atualizados" };

function Metric({ label, value, hint, tone = "green" }: { label: string; value: string | number; hint: string; tone?: "green" | "amber" | "blue" | "dark" }) {
  const colors = { green: "bg-emerald-50 text-emerald-800", amber: "bg-amber-50 text-amber-900", blue: "bg-sky-50 text-sky-900", dark: "bg-[#e9eeeb] text-[#18251f]" };
  return <article className="rounded-2xl border border-black/[.07] bg-white p-5 shadow-[0_2px_10px_rgba(20,40,30,.025)]">
    <p className="text-sm font-medium text-[#718078]">{label}</p><p className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</p><p className={`mt-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${colors[tone]}`}>{hint}</p>
  </article>;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const [profileResult, subscriptionResult, chargeResult, settingsResult, auditResult] = await Promise.all([
    supabase.from("profiles").select("id,name,email,created_at,is_admin").order("created_at", { ascending: false }).limit(1000),
    supabase.from("subscriptions").select("user_id,plan,period_end,admin_override_until"),
    supabase.from("charges").select("id,user_id,plan,amount_cents,status,provider,created_at,paid_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("billing_settings").select("pix_key,pix_holder_name").eq("singleton", true).maybeSingle(),
    supabase.from("admin_audit").select("id,action,target_user,details,created_at").order("created_at", { ascending: false }).limit(12),
  ]);
  const firstError = profileResult.error || subscriptionResult.error || chargeResult.error || settingsResult.error;
  if (firstError) return <section className="rounded-2xl border border-rose-200 bg-white p-6"><h1 className="font-display text-2xl font-semibold">Não consegui carregar os dados</h1><p role="alert" className="mt-2 text-rose-800">Confira a conexão do banco e a migração de aprovação manual antes de gerenciar pedidos.</p></section>;

  const profiles = profileResult.data ?? [];
  const subscriptions = new Map((subscriptionResult.data ?? []).map((item) => [item.user_id, item]));
  const charges = chargeResult.data ?? [];
  const customers = profiles.filter((profile) => !profile.is_admin);
  const pending = charges.filter((charge) => charge.status === "pending");
  const pixPending = pending.filter((charge) => charge.provider === "manual_pix");
  const now = Date.now();
  const activeCount = customers.filter((profile) => {
    const sub = subscriptions.get(profile.id);
    return [sub?.period_end, sub?.admin_override_until].some((until) => until && new Date(until).getTime() > now);
  }).length;
  const paidTotal = charges.filter((charge) => charge.status === "approved").reduce((sum, charge) => sum + Number(charge.amount_cents), 0);
  const byCustomer = new Map<string, typeof charges[number]>();
  for (const charge of charges) if (!byCustomer.has(charge.user_id)) byCustomer.set(charge.user_id, charge);
  const configured = Boolean(settingsResult.data?.pix_key?.trim() && settingsResult.data?.pix_holder_name?.trim());

  return <div className="space-y-9">
    <section id="visao-geral" className="scroll-mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#176b4b]">Visão geral</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Central de administração</h1><p className="mt-2 max-w-2xl text-[#718078]">Acompanhe clientes, revise pedidos e libere o acesso depois de confirmar cada pagamento.</p></div>
        <span className="rounded-full border border-emerald-900/10 bg-white px-3 py-2 text-xs font-semibold text-emerald-900">● Acesso restrito ao administrador</span>
      </div>
      {!configured && <a href="#recebimento" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-950 hover:bg-amber-100"><span><strong className="block">Falta configurar o recebimento Pix</strong><span className="mt-1 block text-sm text-amber-900/80">O checkout está pausado até você informar sua chave e o nome do titular.</span></span><span className="font-bold">Configurar agora →</span></a>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Clientes cadastrados" value={customers.length} hint="Contas de clientes" tone="dark" />
        <Metric label="Acessos ativos" value={activeCount} hint="Assinatura vigente" tone="green" />
        <Metric label="Pedidos aguardando" value={pending.length} hint={pixPending.length ? `${pixPending.length} Pix para conferir` : "Sem Pix pendente"} tone={pending.length ? "amber" : "blue"} />
        <Metric label="Pagamentos confirmados" value={formatBRL(paidTotal)} hint={`${charges.filter((charge) => charge.status === "approved").length} cobranças aprovadas`} tone="green" />
      </div>
    </section>

    <section id="pedidos" className="scroll-mt-6 rounded-2xl border border-black/[.07] bg-white p-5 shadow-[0_2px_10px_rgba(20,40,30,.025)] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#718078]">Fila de revisão</p><h2 className="mt-2 font-display text-2xl font-semibold">Pedidos e pagamentos</h2><p className="mt-1 text-sm text-[#718078]">Confira o crédito no banco antes de confirmar um Pix manual.</p></div><span className="rounded-full bg-[#f3f5f2] px-3 py-1.5 text-sm font-bold">{pending.length} aguardando</span></div>
      <div className="mt-5 space-y-3">
        {charges.length === 0 ? <p className="rounded-xl bg-[#f6f8f6] p-5 text-sm text-[#718078]">Ainda não há pedidos. Os novos pedidos aparecerão aqui assim que um cliente iniciar o checkout.</p> : charges.slice(0, 100).map((charge) => {
          const customer = profiles.find((profile) => profile.id === charge.user_id);
          const pendingManual = charge.provider === "manual_pix" && charge.status === "pending";
          return <article key={charge.id} className="rounded-xl border border-black/[.08] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{customer?.name || "Cliente"}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${charge.status === "approved" ? "bg-emerald-50 text-emerald-800" : charge.status === "pending" ? "bg-amber-50 text-amber-900" : "bg-[#f3f5f2] text-[#66736c]"}`}>{statusLabel[charge.status] ?? charge.status}</span></div><p className="mt-1 break-all text-sm text-[#718078]">{customer?.email || "E-mail indisponível"}</p><p className="mt-2 text-sm text-[#4d5b53]">Plano {PLANS[charge.plan as PlanId]?.name ?? charge.plan} · {charge.provider === "manual_pix" ? "Pix conferido manualmente" : "Mercado Pago"}</p><p className="mt-1 text-xs text-[#87918b]">Criado {date(charge.created_at)} · Pedido {charge.id.slice(0, 8).toUpperCase()}</p></div>
              <p className="font-display text-xl font-semibold">{formatBRL(Number(charge.amount_cents))}</p>
            </div>
            {pendingManual && <div className="mt-4 rounded-xl bg-amber-50/70 p-4"><p className="text-sm font-medium text-amber-950">Abra seu app do banco e confirme o crédito recebido antes de liberar este acesso.</p><ManualPixReviewForm id={charge.id} /></div>}
            {charge.status === "pending" && charge.provider !== "manual_pix" && <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-950">Aguardando a confirmação automática e segura do Mercado Pago.</p>}
          </article>;
        })}
      </div>
    </section>

    <section id="clientes" className="scroll-mt-6 rounded-2xl border border-black/[.07] bg-white p-5 shadow-[0_2px_10px_rgba(20,40,30,.025)] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#718078]">Base de clientes</p><h2 className="mt-2 font-display text-2xl font-semibold">Clientes</h2><p className="mt-1 text-sm text-[#718078]">A situação de acesso vem da assinatura e dos pagamentos confirmados.</p></div><span className="rounded-full bg-[#f3f5f2] px-3 py-1.5 text-sm font-bold">{customers.length} contas</span></div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-black/[.07]">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="bg-[#f7f9f7] text-xs uppercase tracking-wide text-[#718078]"><tr><th className="px-4 py-3 font-semibold">Cliente</th><th className="px-4 py-3 font-semibold">Cadastro</th><th className="px-4 py-3 font-semibold">Plano</th><th className="px-4 py-3 font-semibold">Acesso</th><th className="px-4 py-3 font-semibold">Último pedido</th></tr></thead>
          <tbody>{customers.map((profile) => {
            const subscription = subscriptions.get(profile.id);
            const ends = [subscription?.period_end, subscription?.admin_override_until].filter(Boolean).map((value) => new Date(value as string)).sort((a, b) => b.getTime() - a.getTime())[0];
            const active = Boolean(ends && ends.getTime() > now);
            const lastCharge = byCustomer.get(profile.id);
            return <tr key={profile.id} className="border-t border-black/[.06] align-top"><td className="px-4 py-4"><strong className="block">{profile.name || "Cliente"}</strong><span className="mt-1 block text-[#718078]">{profile.email || "E-mail indisponível"}</span></td><td className="px-4 py-4 text-[#66736c]">{date(profile.created_at)}</td><td className="px-4 py-4">{subscription?.plan ? PLANS[subscription.plan as PlanId]?.name ?? subscription.plan : "Sem plano"}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-emerald-50 text-emerald-800" : "bg-[#f3f5f2] text-[#66736c]"}`}>{active ? `Ativo até ${ends!.toLocaleDateString("pt-BR")}` : "Inativo"}</span></td><td className="px-4 py-4 text-[#66736c]">{lastCharge ? `${statusLabel[lastCharge.status] ?? lastCharge.status} · ${formatBRL(Number(lastCharge.amount_cents))}` : "Sem pedido"}</td></tr>;
          })}{customers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-[#718078]">Nenhum cliente cadastrado ainda.</td></tr>}</tbody>
        </table>
      </div>
    </section>

    <section id="recebimento" className="scroll-mt-6 rounded-2xl border border-black/[.07] bg-white p-5 shadow-[0_2px_10px_rgba(20,40,30,.025)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#718078]">Checkout do cliente</p><h2 className="mt-2 font-display text-2xl font-semibold">Recebimento via Pix</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#718078]">Informe a chave que recebe na sua conta Nubank e o nome do titular. Sem esses dados, o botão de pagamento permanece bloqueado para evitar que o cliente transfira para o destinatário errado.</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${configured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{configured ? "Recebimento configurado" : "Configuração pendente"}</span></div>
      <div className="mt-5 rounded-xl bg-[#f7f9f7] p-4 sm:p-5"><ManualPixSettingsForm pixKey={settingsResult.data?.pix_key ?? ""} holder={settingsResult.data?.pix_holder_name ?? ""} /></div>
    </section>

    <section id="atividade" className="scroll-mt-6 rounded-2xl border border-black/[.07] bg-white p-5 shadow-[0_2px_10px_rgba(20,40,30,.025)] sm:p-7">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-[#718078]">Rastro administrativo</p><h2 className="mt-2 font-display text-2xl font-semibold">Atividade recente</h2>
      <div className="mt-4 divide-y divide-black/[.06]">{(auditResult.data ?? []).map((event) => <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm font-medium">{auditLabels[event.action] ?? "Ação administrativa"}</span><time className="text-xs text-[#87918b]">{date(event.created_at)}</time></div>)}{(!auditResult.data || auditResult.data.length === 0) && <p className="py-4 text-sm text-[#718078]">As aprovações e alterações feitas aqui aparecerão nesta lista.</p>}</div>
    </section>
  </div>;
}
