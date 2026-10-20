import Link from "next/link";
import { Logo } from "@/components/Logo";
import { PLANS } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/finance/money";

const features = {
  basic: ["Receitas, despesas, contas e painel financeiro", "Orçamentos, metas e lançamentos recorrentes", "Relatórios mensais e exportação CSV"],
  max: ["Tudo do Básico", "Importação de lançamentos por CSV", "Compartilhamento familiar e backup JSON"],
};
export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Logo />
        <nav className="flex gap-2"><Link href="/entrar" className="btn-ghost !py-2">Entrar</Link><Link href="/cadastrar" className="btn-primary !py-2">Criar conta</Link></nav>
      </header>
      <section className="ruled">
        <div className="mx-auto max-w-5xl px-4 py-20 md:py-28">
          <h1 className="max-w-2xl font-display text-5xl font-semibold leading-[1.05] md:text-7xl">Seu dinheiro, em ordem.</h1>
          <p className="mt-6 max-w-xl text-lg text-muted">Saiba quanto você tem, quanto pode gastar hoje e para onde cada real está indo. Simples para quem nunca controlou as finanças.</p>
          <Link href="/#planos" className="btn-primary mt-8">Ver planos e começar</Link>
        </div>
      </section>
      <section id="planos" className="mx-auto max-w-5xl scroll-mt-8 px-4 py-16">
        <h2 className="font-display text-3xl font-semibold">Dois planos, sem pegadinha</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id) => (
            <article key={id} className="rounded-2xl border border-ink/15 bg-white p-6">
              <h3 className="font-display text-2xl font-semibold">{PLANS[id].name}</h3>
              <p className="mt-1 text-3xl font-bold">{formatBRL(PLANS[id].priceCents)}<span className="text-base font-normal text-muted"> /mês</span></p>
              <ul className="mt-4 space-y-2 text-muted">{features[id].map((f) => <li key={f}>✓ {f}</li>)}</ul>
              <Link href={`/cadastrar?plano=${id}`} className="btn-primary mt-6 w-full">Escolher {PLANS[id].name}</Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
