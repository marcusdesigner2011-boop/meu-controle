import { LoginForm } from "../forms";
import Link from "next/link";
export const metadata = { title: "Entrar · Meu Controle" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const sp = await searchParams;
  const next = sp.next === "/assinar?plano=max" ? sp.next : sp.next === "/assinar?plano=basic" ? sp.next : "/painel";
  return (<><h1 className="font-display text-3xl font-semibold">Entrar</h1><p className="mb-6 mt-2 text-muted">Acesse suas finanças e continue para o pagamento do plano.</p><LoginForm next={next} /><div className="mt-6 rounded-xl bg-sand/50 p-4 text-sm"><p className="font-semibold">Ainda não tem conta?</p><p className="mt-1 text-muted">Veja os planos e crie seu acesso gratuito para iniciar.</p><Link href="/#planos" className="mt-3 inline-block font-semibold text-leaf underline">Ver planos e preços</Link></div></>);
}
