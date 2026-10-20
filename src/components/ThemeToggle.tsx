"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggleTheme() {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("meu-controle-theme", next); } catch { /* Theme still changes for this visit. */ }
    setTheme(next);
  }

  return <button
    type="button"
    onClick={toggleTheme}
    aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
    aria-pressed={theme === "dark"}
    title={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
    className="fixed bottom-20 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-3 text-sm font-semibold text-ink shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl md:bottom-6"
  >
    <span aria-hidden="true" className="text-lg leading-none">{theme === "dark" ? "☀" : "☾"}</span>
    <span>{theme === "dark" ? "Claro" : "Escuro"}</span>
  </button>;
}
