import Link from "next/link";
import { monthLabel, qs, shiftMonth } from "@/lib/dates";
export function MonthNav({ mes, base, params = {} }: { mes: string; base: string; params?: Record<string, string | undefined> }) {
  const href = (m: string) => `${base}?${qs({ ...params, mes: m })}`;
  return (
    <div className="flex items-center gap-2">
      <Link aria-label="Mês anterior" href={href(shiftMonth(mes, -1))} className="btn-ghost !px-3 !py-2">←</Link>
      <span className="min-w-40 text-center font-display text-lg capitalize">{monthLabel(mes)}</span>
      <Link aria-label="Próximo mês" href={href(shiftMonth(mes, 1))} className="btn-ghost !px-3 !py-2">→</Link>
    </div>
  );
}
