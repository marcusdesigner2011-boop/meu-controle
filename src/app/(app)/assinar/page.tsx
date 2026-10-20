import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/finance/money";
import { PixCheckoutForm } from "../billing-forms";
export const metadata = { title: "Planos e pagamento · Meu Controle" };

export default async function Assinar({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const sp = await searchParams, plan: PlanId = sp.plano === "max" ? "max" : "basic";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: subscription }, { data: pending }] = await Promise.all([
    supabase.from("subscriptions").select("plan,period_end,admin_override_until").eq("user_id", user!.id).maybeSingle(),
    supabase.from("charges").select("id,plan,expires_at").eq("user_id", user!.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const activeUntil = [subscription?.period_end, subscription?.admin_override_until].filter(Boolean).map((x) => new Date(x as string)).sort((a,b) => b.getTime()-a.getTime())[0];
  const active = !!activeUntil && activeUntil > new Date();
  return <div className="mx-auto max-w-2xl space-y-6">
    <div><h1 className="font-display text-3xl font-semibold">Escolha seu plano</h1><p className="mt-2 text-muted">Depois de pagar, o Mercado Pago confirma a cobrança e libera seu acesso automaticamente.</p></div>
    {active && <div className="rounded-xl border border-leaf/20 bg-leaf/5 p-4"><p className="font-semibold text-leafdark">Seu acesso está ativo até {activeUntil!.toLocaleDateString("pt-BR")}.</p><Link href="/painel" className="mt-2 inline-block font-semibold text-leaf underline">Ir para o painel</Link></div>}
    {pending && <div className="rounded-xl border border-ink/10 bg-white p-4"><p className="font-semibold">Você tem um Pix aguardando pagamento.</p><Link href={`/assinar/pagamento/${pending.id}`} className="mt-2 inline-block font-semibold text-leaf underline">Continuar pagamento do plano {PLANS[pending.plan as PlanId]?.name ?? "escolhido"}</Link></div>}
    <section className="card space-y-4"><h2 className="font-display text-xl font-semibold">Pagamento via Pix</h2><PixCheckoutForm key={plan} plan={plan}/></section>
    <div className="grid gap-3 sm:grid-cols-2">{(Object.keys(PLANS) as PlanId[]).map((id) => <Link key={id} href={`/assinar?plano=${id}`} aria-current={plan===id?"true":undefined} className={`rounded-xl border p-4 ${plan===id?"border-leaf bg-leaf/5":"border-ink/10 bg-white"}`}><strong>{PLANS[id].name}</strong><span className="mt-1 block text-sm text-muted">{formatBRL(PLANS[id].priceCents)} / mês</span></Link>)}</div>
    <p className="text-xs text-muted">A cobrança é processada pelo Mercado Pago. O acesso é ativado somente após confirmação do pagamento.</p>
  </div>;
}
