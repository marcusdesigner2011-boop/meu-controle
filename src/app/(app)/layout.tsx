import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Nav } from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../(auth)/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-white/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/painel"><Logo /></Link>
          <Nav />
          <form action={signOut}><button className="btn-ghost !px-4 !py-2 text-sm">Sair</button></form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 md:pb-10">{children}</main>
    </div>
  );
}
