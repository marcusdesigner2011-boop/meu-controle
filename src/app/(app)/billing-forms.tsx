"use client";
import { useActionState } from "react";
import { Submit, Msg } from "@/components/ui";
import { formatBRL } from "@/lib/finance/money";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { startPixPayment } from "./billing-actions";

export function PixCheckoutForm({ plan }: { plan: PlanId }) {
  const [state, action] = useActionState(startPixPayment, {});
  return <form action={action} className="space-y-4">
    <input type="hidden" name="plan" value={plan} />
    <div className="rounded-xl bg-sand/50 p-4"><p className="font-semibold">Plano {PLANS[plan].name}</p><p className="font-display text-2xl font-semibold">{formatBRL(PLANS[plan].priceCents)} <span className="text-sm font-normal text-muted">por mês</span></p><p className="mt-1 text-sm text-muted">Pagamento mensal via Pix. A renovação é feita por você, sem cobrança automática.</p></div>
    <label className="block"><span className="label">CPF do pagador</span><input name="cpf" type="text" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" required className="input" /></label>
    <p className="text-xs text-muted">O CPF é enviado ao Mercado Pago para gerar a cobrança e não é salvo pelo Meu Controle.</p>
    <Msg s={state} /><Submit>Gerar Pix seguro</Submit>
  </form>;
}
