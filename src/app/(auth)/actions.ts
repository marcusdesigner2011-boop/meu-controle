"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type PlanId } from "@/lib/billing/plans";

export type FormState = { error?: string; ok?: string };
const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// Traduz o erro real do Supabase e registra o detalhe no terminal (onde roda "npm run dev").
function explain(e: { code?: string; message?: string; status?: number; name?: string }): string {
  console.error("[auth]", { code: e.code, status: e.status, name: e.name, message: e.message });
  const c = e.code ?? "", m = (e.message ?? "").toLowerCase();
  if (c === "user_already_exists" || c === "email_exists") return "Este e-mail já tem cadastro. Tente entrar ou use “Esqueci minha senha”.";
  if (c === "over_email_send_rate_limit" || c === "over_request_rate_limit" || e.status === 429)
    return "Limite de e-mails/tentativas do Supabase atingido. Aguarde cerca de 1 hora, ou desligue “Confirm email” no Supabase para testar.";
  if (c === "weak_password") return "Senha fraca demais. Use uma senha maior, com letras e números.";
  if (c === "email_address_invalid" || c === "validation_failed") return "O Supabase não aceitou esse e-mail. Tente outro endereço.";
  if (c === "signup_disabled") return "Novos cadastros estão desativados no Supabase (Authentication > Sign In / Providers > Allow new users to sign up).";
  if (c === "invalid_credentials") return "E-mail ou senha incorretos.";
  if (c === "email_not_confirmed") return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (e.name === "AuthRetryableFetchError" || m.includes("fetch failed") || m.includes("invalid api key") || c === "no_authorization")
    return "Não consegui falar com o Supabase. Confira a URL e a chave no .env.local e reinicie o servidor (npm run dev).";
  if (m.includes("database error")) return "O Supabase falhou ao criar o seu perfil no banco. Rode os SQLs 0001 e 0003 e tente de novo.";
  return `Não foi possível concluir (código: ${c || e.status || "desconhecido"}).`;
}

export async function signUp(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, "name"), email = str(f, "email").toLowerCase(), password = String(f.get("password") ?? "");
  const selectedPlan = str(f, "plan");
  const plan = selectedPlan in PLANS ? selectedPlan as PlanId : "basic";
  if (name.length < 2) return { error: "Informe seu nome." };
  if (!emailOk(email)) return { error: "Informe um e-mail válido." };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${site()}/auth/callback?next=${encodeURIComponent(`/assinar?plano=${plan}`)}` } });
  if (error) return { error: explain(error) };
  if (data.session) redirect(`/assinar?plano=${plan}`);
  return { ok: `Cadastro iniciado. Confirme seu e-mail; depois, entre para pagar o plano ${PLANS[plan].name}.` };
}

export async function signIn(_: FormState, f: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(f, "email").toLowerCase(), password: String(f.get("password") ?? "") });
  if (error) return { error: explain(error) };
  const rawNext = str(f, "next");
  const next = /^\/assinar(?:\?plano=(?:basic|max))?$/.test(rawNext) ? rawNext : "/painel";
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export async function requestReset(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  if (!emailOk(email)) return { error: "Informe um e-mail válido." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${site()}/auth/callback?next=/redefinir-senha` });
  return { ok: "Se esse e-mail estiver cadastrado, você receberá um link para criar uma nova senha." }; // mesma resposta sempre
}

export async function updatePassword(_: FormState, f: FormData): Promise<FormState> {
  const password = String(f.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password !== String(f.get("confirm") ?? "")) return { error: "As senhas não são iguais." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Link expirado. Peça um novo em “Esqueci minha senha”." };
  redirect("/painel");
}
