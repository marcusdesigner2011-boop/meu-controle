import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });
export const metadata: Metadata = { title: "Meu Controle", description: "Controle financeiro pessoal e familiar." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR" suppressHydrationWarning className={`${display.variable} ${body.variable}`}>
    <head><script dangerouslySetInnerHTML={{ __html: `try { const saved = localStorage.getItem("meu-controle-theme"); if (saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches)) document.documentElement.classList.add("dark"); } catch {}` }} /></head>
    <body>{children}<ThemeToggle /></body>
  </html>;
}
