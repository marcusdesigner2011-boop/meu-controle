"use client";

import { useActionState } from "react";
import { Msg } from "@/components/ui";
import { reviewManualPixCharge, saveManualPixSettings } from "./admin-actions";

export function ManualPixSettingsForm({ pixKey, holder }: { pixKey: string; holder: string }) {
  const [state, action] = useActionState(saveManualPixSettings, {});
  return <form action={action} className="space-y-4">
    <label className="block"><span className="label">Sua chave Pix (CPF, CNPJ, e-mail, telefone ou aleatória)</span>
      <input name="pix_key" type="text" autoComplete="off" defaultValue={pixKey} required maxLength={180} className="input" placeholder="Digite a chave que recebe no Nubank" />
    </label>
    <label className="block"><span className="label">Nome do titular da conta</span>
      <input name="pix_holder_name" type="text" autoComplete="name" defaultValue={holder} required maxLength={100} className="input" placeholder="Nome que aparece para quem paga" />
    </label>
    <p className="text-xs text-muted">A chave ficará visível aos clientes na tela de pagamento. Confira se pertence à conta onde você verificará os recebimentos.</p>
    <Msg s={state} />
    <button type="submit" className="btn-primary">Salvar dados Pix</button>
  </form>;
}

export function ManualPixReviewForm({ id }: { id: string }) {
  const [state, action] = useActionState(reviewManualPixCharge, {});
  return <form action={action} className="mt-3 space-y-2">
    <input type="hidden" name="id" value={id} />
    <div className="flex flex-wrap gap-2">
      <button name="decision" value="approve" className="btn-primary !w-auto !py-2">Confirmar Pix recebido</button>
      <button name="decision" value="reject" className="btn-ghost !w-auto !py-2 text-clay">Recusar</button>
    </div>
    <p className="text-xs text-muted">Só confirme depois de verificar o crédito no extrato do Nubank.</p>
    <Msg s={state} />
  </form>;
}
