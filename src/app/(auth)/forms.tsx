"use client";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, requestReset, updatePassword, type FormState } from "./actions";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { formatBRL } from "@/lib/finance/money";

const init: FormState = {};
function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? "Aguarde…" : children}</button>;
}
function Field(p: { label: string; name: string; type?: string; auto?: string; hint?: string }) {
  return (
    <div>
      <label htmlFor={p.name} className="label">{p.label}</label>
      <input id={p.name} name={p.name} type={p.type ?? "text"} autoComplete={p.auto} required className="input" aria-describedby={p.hint ? `${p.name}-h` : undefined} />
      {p.hint && <p id={`${p.name}-h`} className="mt-1 text-sm text-muted">{p.hint}</p>}
    </div>
  );
}
function Msg({ s }: { s: FormState }) {
  if (s.error) return <p role="alert" className="rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">{s.error}</p>;
  if (s.ok) return <p role="status" className="rounded-lg bg-leaf/10 px-4 py-3 text-sm text-leafdark">{s.ok}</p>;
  return null;
}
const A = ({ href, children }: { href: string; children: React.ReactNode }) => <Link href={href} className="font-semibold text-leaf underline-offset-4 hover:underline">{children}</Link>;

export function LoginForm({ next = "/painel" }: { next?: string }) {
  const [s, a] = useActionState(signIn, init);
  return (<form action={a} className="space-y-4">
    <input type="hidden" name="next" value={next} />
    <Field label="E-mail" name="email" type="email" auto="email" />
    <Field label="Senha" name="password" type="password" auto="current-password" />
    <Msg s={s} /><Submit>Entrar</Submit>
    <p className="text-sm"><A href="/recuperar-senha">Esqueci minha senha</A></p>
    <p className="text-sm text-muted">Novo por aqui? <A href="/cadastrar">Criar conta</A></p>
    <p className="text-sm text-muted">Conheça os <A href="/#planos">planos e preços</A>.</p>
  </form>);
}
export function SignupForm({ defaultPlan = "basic" }: { defaultPlan?: PlanId }) {
  const [s, a] = useActionState(signUp, init);
  return (<form action={a} className="space-y-4">
    <fieldset className="space-y-3">
      <legend className="label">Escolha seu plano</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(PLANS) as PlanId[]).map((plan) => (
          <label key={plan} className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/15 bg-white p-4 has-[:checked]:border-leaf has-[:checked]:bg-leaf/5">
            <input type="radio" name="plan" value={plan} defaultChecked={plan === defaultPlan} className="mt-1 accent-leaf" />
            <span><strong className="block">{PLANS[plan].name}</strong><span className="text-sm text-muted">{formatBRL(PLANS[plan].priceCents)} / mês</span></span>
          </label>
        ))}
      </div>
    </fieldset>
    <Field label="Nome" name="name" auto="name" />
    <Field label="E-mail" name="email" type="email" auto="email" />
    <Field label="Senha" name="password" type="password" auto="new-password" hint="Mínimo de 8 caracteres." />
    <p className="text-xs text-muted">Após confirmar o e-mail, você verá o Pix para pagar. O acesso será liberado quando o Mercado Pago confirmar o pagamento.</p>
    <Msg s={s} /><Submit>Criar conta e continuar</Submit>
    <p className="text-sm text-muted">Já tem conta? <A href="/entrar">Entrar</A></p>
  </form>);
}
export function ResetForm() {
  const [s, a] = useActionState(requestReset, init);
  return (<form action={a} className="space-y-4">
    <Field label="E-mail da sua conta" name="email" type="email" auto="email" />
    <Msg s={s} /><Submit>Enviar link</Submit>
    <p className="text-sm"><A href="/entrar">Voltar ao login</A></p>
  </form>);
}
export function NewPasswordForm() {
  const [s, a] = useActionState(updatePassword, init);
  return (<form action={a} className="space-y-4">
    <Field label="Nova senha" name="password" type="password" auto="new-password" hint="Mínimo de 8 caracteres." />
    <Field label="Repita a nova senha" name="confirm" type="password" auto="new-password" />
    <Msg s={s} /><Submit>Salvar senha</Submit>
  </form>);
}
