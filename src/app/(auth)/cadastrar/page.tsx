import { SignupForm } from "../forms";
import type { PlanId } from "@/lib/billing/plans";
export const metadata = { title: "Criar conta · Meu Controle" };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string,string|undefined>> }) {
  const plan = (await searchParams).plano === "max" ? "max" : "basic";
  return (<><h1 className="font-display text-3xl font-semibold">Criar conta</h1><p className="mb-6 mt-2 text-muted">Cadastre-se, escolha um plano e pague com Pix.</p><SignupForm defaultPlan={plan as PlanId} /></>);
}
