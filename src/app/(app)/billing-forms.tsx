"use client";
import { useActionState } from "react";
import { Submit, Msg } from "@/components/ui";
import { formatBRL } from "@/lib/finance/money";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { startManualPixPayment } from "./billing-actions";

export function ManualPixCheckoutForm({ plan }: { plan: PlanId }) {
  const [state, action] = useActionState(startManualPixPayment, {});
  return <form action={action} className="space-y-4">
    <input type="hidden" name="plan" value={plan} />
    <div className="rounded-xl bg-sand/50 p-4"><p className="font-semibold">Plano {PLANS[plan].name}</p><p className="font-display text-2xl font-semibold">{formatBRL(PLANS[plan].priceCents)} <span className="text-sm font-normal text-muted">por mês</span></p><p className="mt-1 text-sm text-muted">Você faz o Pix manualmente. O acesso só é liberado depois de o responsável conferir o recebimento na conta.</p></div>
    <Msg s={state} /><Submit>Ver dados para pagar com Pix</Submit>
  </form>;
}
