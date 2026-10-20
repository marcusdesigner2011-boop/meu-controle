"use client";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/(auth)/actions";

export function Submit({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? "Salvando…" : children}</button>;
}
export function Msg({ s }: { s: FormState }) {
  if (s.error) return <p role="alert" className="rounded-lg bg-clay/10 px-4 py-3 text-sm text-clay">{s.error}</p>;
  if (s.ok) return <p role="status" className="rounded-lg bg-leaf/10 px-4 py-3 text-sm text-leafdark">{s.ok}</p>;
  return null;
}
export function Field(p: { label: string; name: string; type?: string; defaultValue?: string; hint?: string; required?: boolean; inputMode?: "decimal" | "text"; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={p.name} className="label">{p.label}</label>
      <input id={p.name} name={p.name} type={p.type ?? "text"} defaultValue={p.defaultValue} required={p.required ?? true} inputMode={p.inputMode} placeholder={p.placeholder} className="input" aria-describedby={p.hint ? `${p.name}-h` : undefined} />
      {p.hint && <p id={`${p.name}-h`} className="mt-1 text-sm text-muted">{p.hint}</p>}
    </div>
  );
}
export function Select(p: { label: string; name: string; defaultValue?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={p.name} className="label">{p.label}</label>
      <select id={p.name} name={p.name} defaultValue={p.defaultValue ?? ""} required={p.required ?? false} className="input">{p.children}</select>
    </div>
  );
}
export function DeleteForm({ action, id, what }: { action: (s: FormState, f: FormData) => Promise<FormState>; id: string; what: string }) {
  const [s, a] = useActionState(action, {});
  return (
    <form action={a} onSubmit={(e) => { if (!confirm(`Excluir ${what}? Esta ação não pode ser desfeita.`)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className="text-sm font-semibold text-clay underline-offset-4 hover:underline">Excluir</button>
      {s.error && <p role="alert" className="mt-1 max-w-56 text-xs text-clay">{s.error}</p>}
    </form>
  );
}
