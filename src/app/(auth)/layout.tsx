import Link from "next/link";
import { Logo } from "@/components/Logo";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen md:grid-cols-2">
      <aside className="ruled hidden flex-col justify-between bg-sand/50 p-12 md:flex">
        <Link href="/"><Logo /></Link>
        <p className="font-display text-4xl leading-tight">Cada centavo no seu lugar,<br />sem planilha complicada.</p>
      </aside>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 block md:hidden"><Logo /></Link>
          {children}
        </div>
      </section>
    </main>
  );
}
