import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=%2Fadmin");
  const { data: profile, error } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();

  if (error || profile?.is_admin !== true) {
    return <main className="grid min-h-screen place-items-center bg-[#f3f5f2] px-5 py-12 text-[#18251f]">
      <section className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-amber-50 text-2xl text-amber-800">🔒</div>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-800">Meu Controle · acesso restrito</p>
        <h1 className="mt-3 font-display text-3xl font-semibold">Esta conta não é administradora</h1>
        <p className="mt-3 leading-6 text-[#66736c]">Você entrou com uma conta de cliente. Saia e entre com a conta de administração para gerenciar clientes e pagamentos.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <form action={signOut}><button className="rounded-xl bg-[#176b4b] px-5 py-3 font-semibold text-white hover:bg-[#10573c]">Sair e trocar de conta</button></form>
          <Link href="/painel" className="rounded-xl border border-black/10 px-5 py-3 font-semibold">Voltar ao Meu Controle</Link>
        </div>
      </section>
    </main>;
  }

  return <div className="min-h-screen bg-[#f3f5f2] text-[#18251f]">
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <Link href="/admin" className="flex items-center gap-3" aria-label="Meu Controle Administração">
          <span className="grid size-10 place-items-center rounded-xl bg-[#176b4b] text-lg font-bold text-white">M</span>
          <span><strong className="block text-sm">Meu Controle</strong><span className="text-xs text-[#77827c]">Central de administração</span></span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-56 truncate text-sm text-[#66736c] sm:block">{user.email}</span>
          <Link href="/painel" className="rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold hover:bg-[#f3f5f2]">Abrir meu app</Link>
          <form action={signOut}><button className="rounded-lg px-3 py-2 text-sm font-semibold text-[#66736c] hover:bg-[#f3f5f2]">Sair</button></form>
        </div>
      </div>
      <nav className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-5 pb-3 lg:px-8" aria-label="Navegação administrativa">
        {[["#visao-geral", "Visão geral"], ["#pedidos", "Pedidos"], ["#clientes", "Clientes"], ["#recebimento", "Recebimento Pix"], ["#atividade", "Atividade"]].map(([href, label]) => <a key={href} href={href} className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-[#66736c] hover:bg-[#edf4ef] hover:text-[#176b4b]">{label}</a>)}
      </nav>
    </header>
    <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8 lg:py-10">{children}</main>
    <footer className="mx-auto max-w-[1440px] px-5 pb-8 text-xs text-[#87918b] lg:px-8">Área administrativa privada · Meu Controle</footer>
  </div>;
}
