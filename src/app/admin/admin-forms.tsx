"use client";

import { useActionState } from "react";
import { Msg } from "@/components/ui";
import { reviewManualPixCharge, saveManualPixSettings } from "./admin-actions";

export function ManualPixSettingsForm({ pixKey, holder }: { pixKey: string; holder: string }) {
  const [state, action] = useActionState(saveManualPixSettings, {});
  return <form action={action} className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
    <label className="block"><span className="mb-1 block text-sm font-semibold">Chave Pix de recebimento</span><input name="pix_key" type="text" autoComplete="off" defaultValue={pixKey} required maxLength={180} className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" /></label>
    <label className="block"><span className="mb-1 block text-sm font-semibold">Nome do titular</span><input name="pix_holder_name" type="text" autoComplete="name" defaultValue={holder} required maxLength={100} className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15" placeholder="Nome exibido pelo banco" /></label>
    <button type="submit" className="rounded-xl bg-[#176b4b] px-5 py-3 font-semibold text-white hover:bg-[#10573c]">Salvar recebimento</button>
    <div className="lg:col-span-3"><p className="text-xs leading-5 text-[#718078]">A chave será exibida aos clientes para que paguem o plano escolhido. Use uma chave da conta onde você verificará os recebimentos.</p><Msg s={state} /></div>
  </form>;
}

export function ManualPixReviewForm({ id }: { id: string }) {
  const [state, action] = useActionState(reviewManualPixCharge, {});
  return <form action={action} className="mt-3 space-y-2"><input type="hidden" name="id" value={id} /><div className="flex flex-wrap gap-2"><button name="decision" value="approve" className="rounded-lg bg-[#176b4b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#10573c]">Confirmar Pix recebido</button><button name="decision" value="reject" className="rounded-lg border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#66736c] hover:bg-[#f7f9f7]">Recusar pedido</button></div><p className="text-xs text-[#718078]">Confirme somente depois de conferir o crédito no extrato do Nubank.</p><Msg s={state} /></form>;
}
