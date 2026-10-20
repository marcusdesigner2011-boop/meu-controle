"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const items = [["/painel", "Painel"], ["/lancamentos", "Lançamentos"], ["/contas", "Contas"], ["/planejamento", "Planejamento"], ["/mais", "Mais"]] as const;
export function Nav({ isAdmin = false }: { isAdmin?: boolean }) {
  const path = usePathname();
  const navItems = isAdmin ? [...items, ["/admin", "Admin"] as const] : items;
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-10 flex border-t border-ink/10 bg-paper pb-[env(safe-area-inset-bottom)] md:static md:border-0 md:bg-transparent md:pb-0">
      {navItems.map(([href, label]) => {
        const planning = ["/orcamentos", "/metas", "/recorrencias"].some((p) => path.startsWith(p));
        const extras = ["/relatorios", "/importar", "/familia", "/categorias"].some((p) => path.startsWith(p));
        const on = path.startsWith(href) || (href === "/planejamento" && planning) || (href === "/mais" && extras);
        return <Link key={href} href={href} aria-current={on ? "page" : undefined}
          className={`flex-1 py-3 text-center text-sm md:flex-none md:rounded-lg md:px-3 md:py-2 ${on ? "font-semibold text-leaf md:bg-leaf/10" : "text-muted hover:text-ink"}`}>{label}</Link>;
      })}
    </nav>
  );
}
