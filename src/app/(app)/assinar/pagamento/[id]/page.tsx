import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PaymentMonitor } from "./payment-monitor";
export const metadata = { title: "Pagar com Pix · Meu Controle" };

export default async function Pagamento({ params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const supabase = await createClient(), { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const [{ data: charge }, { data: settings }] = await Promise.all([
    supabase.from("charges").select("id,status,plan,amount_cents,provider").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("billing_settings").select("pix_key,pix_holder_name").eq("singleton", true).maybeSingle(),
  ]);
  if (!charge || charge.provider !== "manual_pix") notFound();
  return <div className="mx-auto max-w-xl space-y-4"><Link href="/assinar" className="text-sm font-semibold text-leaf underline">← Voltar aos planos</Link><PaymentMonitor id={charge.id} pixKey={settings?.pix_key ?? ""} holder={settings?.pix_holder_name ?? ""} amountCents={Number(charge.amount_cents)} plan={charge.plan}/></div>;
}
