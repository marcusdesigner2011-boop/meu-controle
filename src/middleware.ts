import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/entrar", "/cadastrar", "/recuperar-senha"];
const BILLABLE_PAGES = ["/painel", "/lancamentos", "/contas", "/categorias", "/planejamento", "/mais", "/orcamentos", "/metas", "/recorrencias", "/relatorios", "/importar", "/familia"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser(); // valida o token no servidor do Supabase
  const path = req.nextUrl.pathname;
  const go = (to: string) => NextResponse.redirect(new URL(to, req.url));
  if (!user && path.startsWith("/painel")) return go("/entrar");
  if (user && AUTH_PAGES.includes(path)) return go("/painel");
  if (user && BILLABLE_PAGES.some((route) => path === route || path.startsWith(`${route}/`))) {
    const [{ data: profile }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle(),
      supabase.from("billing_settings").select("checkout_cutover_at").eq("singleton", true).maybeSingle(),
    ]);
    // Sem perfil/corte verificável, não concede acesso por engano.
    if (!profile || !settings) return go("/assinar?pagamento=verificacao-indisponivel");
    if (new Date(profile.created_at) >= new Date(settings.checkout_cutover_at)) {
      const { data: subscription, error } = await supabase.from("subscriptions")
        .select("period_end,admin_override_until").eq("user_id", user.id).maybeSingle();
      const now = Date.now();
      const paid = [subscription?.period_end, subscription?.admin_override_until]
        .some((end) => end && new Date(end).getTime() > now);
      if (error || !paid) return go("/assinar");
    }
  }
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"] };
