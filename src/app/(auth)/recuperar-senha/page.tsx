import { ResetForm } from "../forms";
export const metadata = { title: "Recuperar senha · Meu Controle" };
export default function Page() {
  return (<><h1 className="font-display text-3xl font-semibold">Recuperar senha</h1><p className="mb-6 mt-2 text-muted">Enviaremos um link para o seu e-mail.</p><ResetForm /></>);
}
