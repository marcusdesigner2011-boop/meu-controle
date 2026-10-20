"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentMonitor({ id, pixBase64, pixCode, expiresAt }: { id: string; pixBase64: string; pixCode: string; expiresAt: string | null }) {
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
        if (data.status === "approved") {
          window.setTimeout(() => router.replace("/painel"), 1800);
        }
      } catch { /* uma tentativa seguinte atualiza o estado */ }
    };
    void check();
    const timer = window.setInterval(check, 5000);
    return () => { live = false; window.clearInterval(timer); };
  }, [id, router]);
  async function copy() {
    try { await navigator.clipboard.writeText(pixCode); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(false); }
  }
  const expired = expiresAt ? new Date(expiresAt) <= new Date() : false;
  return <section className="card space-y-5 text-center">
    {status === "approved" ? <div className="space-y-2"><div className="mx-auto grid size-14 place-items-center rounded-full bg-leaf/10 text-2xl text-leaf">✓</div><h2 className="font-display text-2xl font-semibold">Pagamento confirmado</h2><p className="text-muted">Seu acesso está liberado. Abrindo seu painel…</p></div> : status === "rejected" || status === "cancelled" || status === "refunded" || expired ? <div className="space-y-3"><h2 className="font-display text-2xl font-semibold">Este Pix não está mais ativo</h2><p className="text-muted">Gere uma nova cobrança para continuar.</p><a className="btn-primary" href="/assinar">Escolher plano e gerar outro Pix</a></div> : <><div><h2 className="font-display text-2xl font-semibold">Pague com Pix</h2><p className="mt-1 text-muted">Aguardando confirmação segura do Mercado Pago…</p></div>{pixBase64&&<img src={`data:image/png;base64,${pixBase64}`} alt="QR Code Pix" className="mx-auto aspect-square w-56 rounded-lg border border-ink/10 p-2"/>}<div className="space-y-2 text-left"><label htmlFor="pix-copy" className="label">Pix copia e cola</label><textarea id="pix-copy" readOnly value={pixCode} rows={4} className="input resize-y font-mono text-xs"/><button type="button" onClick={copy} className="btn-primary">{copied?"Código copiado":"Copiar código Pix"}</button></div><p className="text-xs text-muted">Esta página verifica o pagamento automaticamente. O QR Code expira em {expiresAt ? new Date(expiresAt).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "breve"}.</p></>}
  </section>;
}
