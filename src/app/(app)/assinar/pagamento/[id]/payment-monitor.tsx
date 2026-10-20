"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/finance/money";
import { QRCodeSVG } from "qrcode.react";

export function PaymentMonitor({ id, pixKey, pixPayload, holder, amountCents, plan }: { id: string; pixKey: string; pixPayload: string; holder: string; amountCents: number; plan: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("pending");
  const [copied, setCopied] = useState<"key" | "code" | null>(null);
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
  async function copy(value: string, kind: "key" | "code") {
    try { await navigator.clipboard.writeText(value); setCopied(kind); window.setTimeout(() => setCopied(null), 2000); }
    catch { setCopied(null); }
  }
  const planName = PLANS[plan as PlanId]?.name ?? plan;
  return <section className="card space-y-5">
    {status === "approved" ? <div className="space-y-2 text-center"><div className="mx-auto grid size-14 place-items-center rounded-full bg-leaf/10 text-2xl text-leaf">✓</div><h2 className="font-display text-2xl font-semibold">Pix conferido</h2><p className="text-muted">O responsável confirmou o recebimento e seu acesso está liberado.</p></div>
      : status === "rejected" || status === "cancelled" || status === "refunded" || status === "expired" ? <div className="space-y-3 text-center"><h2 className="font-display text-2xl font-semibold">Pagamento não aprovado</h2><p className="text-muted">Fale com o responsável ou inicie um novo pedido de Pix.</p><a className="btn-primary" href="/assinar">Escolher plano novamente</a></div>
      : <>
        <div className="text-center"><h2 className="font-display text-2xl font-semibold">Pague com Pix</h2><p className="mt-1 text-muted">Plano {planName} · {formatBRL(amountCents)}</p></div>
        {!pixKey ? <p className="rounded-lg bg-sand p-4 text-sm text-muted">Os dados Pix estão sendo configurados. Não faça o pagamento ainda.</p> : <>
          <div className="space-y-2"><p className="label">Titular que deve aparecer no app do banco</p><p className="rounded-lg bg-sand/60 p-3 font-semibold">{holder || "Confira o nome antes de pagar"}</p></div>
          {pixPayload ? <div className="rounded-2xl border border-ink/10 bg-white p-5 text-center"><p className="label">Escaneie com o app do seu banco</p><div className="mx-auto mt-3 w-fit rounded-xl bg-white p-2"><QRCodeSVG value={pixPayload} size={256} level="M" marginSize={4} title={`QR Pix do plano ${planName}`} /></div><p className="mt-3 text-sm text-muted">Confira o nome do titular e o valor antes de pagar.</p><button type="button" onClick={() => copy(pixPayload, "code")} className="btn-primary mt-4">{copied === "code" ? "Código Pix copiado" : "Copiar código Pix"}</button></div> : <p className="rounded-lg bg-sand p-4 text-sm text-muted">O QR Pix ainda não pode ser gerado. Use a chave abaixo somente se o titular e a cidade conferirem.</p>}
          <details className="rounded-xl border border-ink/10 p-4"><summary className="cursor-pointer font-semibold">Usar a chave Pix manualmente</summary><div className="mt-3 space-y-2"><label htmlFor="pix-key" className="label">Chave Pix</label><textarea id="pix-key" readOnly value={pixKey} rows={2} className="input resize-y font-mono text-sm"/><button type="button" onClick={() => copy(pixKey, "key")} className="btn-ghost !w-auto">{copied === "key" ? "Chave copiada" : "Copiar chave Pix"}</button></div></details>
          <div className="rounded-lg border border-ink/10 p-4 text-sm"><p><strong>Valor:</strong> {formatBRL(amountCents)}</p><p className="mt-1"><strong>Descrição/identificação:</strong> Meu Controle {id.slice(0, 8)}</p></div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted"><li>Abra o app do Nubank ou de outro banco e faça um Pix para a chave acima.</li><li>Confira se o titular e o valor estão corretos. Se algo divergir, não conclua o pagamento.</li><li>Depois do Pix, aguarde a conferência manual. O acesso só é liberado quando o recebimento for confirmado na conta.</li></ol>
          <p className="break-all text-xs text-muted">Pedido: {id}</p>
          <p role="status" className="rounded-lg bg-sand/60 p-3 text-sm text-muted">Status: aguardando o responsável conferir o recebimento.</p>
        </>}
      </>}
  </section>;
}
