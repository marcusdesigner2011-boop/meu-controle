import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentMonitor } from "./payment-monitor";
export const metadata = { title: "Pagar com Pix · Meu Controle" };

export default async function Pagamento({ params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const supabase = await createClient(), { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: charge } = await supabase.from("charges").select("id,status,pix_qr,pix_copy_paste,expires_at")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!charge) notFound();
  return <div className="mx-auto max-w-xl space-y-4"><Link href="/assinar" className="text-sm font-semibold text-leaf underline">← Voltar aos planos</Link><PaymentMonitor id={charge.id} pixBase64={charge.pix_qr ?? ""} pixCode={charge.pix_copy_paste ?? ""} expiresAt={charge.expires_at}/></div>;
}
