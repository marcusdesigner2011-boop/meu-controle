"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/finance/money";

export function PaymentMonitor({ id, pixKey, holder, amountCents, plan }: { id: string; pixKey: string; holder: string; amountCents: number; plan: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("pending");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let live = true;
    const check = async () => {
      try {
        const response = await fetch(`/api/payments/status?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!live) return;
        setStatus(data.status);
        if (data.status === "approved") window.setTimeout(() => router.replace("/painel"), 1800);
      } catch { /* a próxima tentativa atualiza o estado */ }
    };
    void check();
    const timer = window.setInterval(check, 10000);
    return () => { live = false; window.clearInterval(timer); };
  }, [id, router]);
  async function copy() {
    try { await navigator.clipboard.writeText(pixKey); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  }
  const planName = PLANS[plan as PlanId]?.name ?? plan;
  return <section className="card space-y-5">
    {status === "approved" ? <div className="space-y-2 text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-leaf/10 text-2xl text-leaf">✓</div><h2 className="font-display text-2xl font-semibold">Pix conferido</h2><p className="text-muted">O responsável confirmou o recebimento e seu acesso está liberado.</p></div>
      : status === "rejected" || status === "cancelled" || status === "refunded" || status === "expired" ? <div className="space-y-3 text-center"><h2 className="font-display text-2xl font-semibold">Pagamento não aprovado</h2><p className="text-muted">Fale com o responsável ou inicie um novo pedido de Pix.</p><a className="btn-primary" href="/assinar">Escolher plano novamente</a></div>
      : <>
        <div className="text-center"><h2 className="font-display text-2xl font-semibold">Pague com Pix</h2><p className="mt-1 text-muted">Plano {planName} · {formatBRL(amountCents)}</p></div>
        {!pixKey ? <p className="rounded-lg bg-sand p-4 text-sm text-muted">Os dados Pix estão sendo configurados. Não faça o pagamento ainda.</p> : <>
          <div className="space-y-2"><p className="label">Titular que deve aparecer no app do banco</p><p className="rounded-lg bg-sand/60 p-3 font-semibold">{holder || "Confira o nome antes de pagar"}</p></div>
          <div className="space-y-2"><label htmlFor="pix-key" className="label">Chave Pix</label><textarea id="pix-key" readOnly value={pixKey} rows={3} className="input resize-y font-mono text-sm"/><button type="button" onClick={copy} className="btn-primary">{copied ? "Chave copiada" : "Copiar chave Pix"}</button></div>
          <div className="rounded-lg border border-ink/10 p-4 text-sm"><p><strong>Valor:</strong> {formatBRL(amountCents)}</p><p className="mt-1"><strong>Descrição/identificação:</strong> Meu Controle {id.slice(0, 8)}</p></div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted"><li>Abra o app do Nubank ou de outro banco e faça um Pix para a chave acima.</li><li>Confira se o titular e o valor estão corretos. Se algo divergir, não conclua o pagamento.</li><li>Depois do Pix, aguarde a conferência manual. O acesso só é liberado quando o recebimento for confirmado na conta.</li></ol>
          <p className="break-all text-xs text-muted">Pedido: {id}</p>
          <p role="status" className="rounded-lg bg-sand/60 p-3 text-sm text-muted">Status: aguardando o responsável conferir o recebimento.</p>
        </>}
      </>}
  </section>;
}
