import { NewPasswordForm } from "../forms";
export const metadata = { title: "Nova senha · Meu Controle" };
export default function Page() {
  return (<><h1 className="font-display text-3xl font-semibold">Nova senha</h1><p className="mb-6 mt-2 text-muted">Escolha uma senha nova para sua conta.</p><NewPasswordForm /></>);
}
