import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DeleteForm } from "@/components/ui";
import { CategoryForm } from "../forms";
import { deleteCategory } from "../actions";
export const metadata = { title: "Categorias · Meu Controle" };
type Cat = { id: string; user_id: string; name: string; kind: string };

export default async function Categorias({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data } = await supabase.from("categories").select("id,user_id,name,kind").order("name");
  const cats = (data ?? []) as Cat[];
  const edit = cats.find((c) => c.id === sp.editar && c.user_id === user?.id);
  const group = (kind: string, title: string) => (
    <section><h2 className="mb-3 font-display text-xl font-semibold">{title}</h2>
      <ul className="space-y-2">{cats.filter((c) => c.kind === kind).map((c) => (
        <li key={c.id} className="card flex items-center justify-between !p-3"><span>{c.name}</span>
          <span>{c.user_id !== user?.id ? <span className="text-xs text-muted">Compartilhada</span> : <span className="flex items-center gap-4"><Link href={`/categorias?editar=${c.id}`} className="text-sm font-semibold text-leaf underline-offset-4 hover:underline">Editar</Link><DeleteForm action={deleteCategory} id={c.id} what={`a categoria “${c.name}”`} /></span>}</span>
        </li>))}</ul></section>
  );
  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-semibold">Categorias</h1>
      <section className="card"><h2 className="mb-4 font-display text-xl font-semibold">{edit ? "Editar categoria" : "Nova categoria"}</h2><CategoryForm key={edit?.id ?? "new"} initial={edit} /></section>
      <div className="grid gap-8 md:grid-cols-2">{group("expense", "Despesas")}{group("income", "Receitas")}</div>
    </div>
  );
}
