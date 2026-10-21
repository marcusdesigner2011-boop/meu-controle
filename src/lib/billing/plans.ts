// Preços SOMENTE aqui (servidor). O navegador envia apenas "basic" | "max".
export const PLANS = {
  basic: {
    name: "Básico",
    priceCents: 999,
    features: [
      "Receitas, despesas, contas e painel financeiro",
      "Orçamentos, metas e lançamentos recorrentes",
      "Relatórios mensais e exportação CSV",
    ],
  },
  max: {
    name: "Max",
    priceCents: 1599,
    features: [
      "Tudo do plano Básico",
      "Importação de lançamentos por arquivo CSV",
      "Compartilhamento familiar das finanças",
      "Backup completo dos dados em JSON",
    ],
  },
} as const;
export type PlanId = keyof typeof PLANS;

// Regra única de datas: +1 mês; se o dia não existir (31 -> fev), usa o último dia do mês.
export function addOneMonth(d: Date): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  const last = new Date(Date.UTC(y, m + 2, 0)).getUTCDate();
  return new Date(Date.UTC(y, m + 1, Math.min(day, last), d.getUTCHours(), d.getUTCMinutes()));
}

// Renovação antecipada soma ao vencimento atual; vencida renova a partir do pagamento.
export function nextPeriod(paidAt: Date, currentEnd: Date | null) {
  const start = currentEnd && currentEnd > paidAt ? currentEnd : paidAt;
  return { start, end: addOneMonth(start) };
}

export type SubStatus = "active" | "pending_renewal" | "expired";
export function subscriptionStatus(end: Date | null, now: Date): SubStatus {
  if (!end || end <= now) return "expired";
  return end.getTime() - now.getTime() <= 3 * 86400000 ? "pending_renewal" : "active";
}

// Pagamento só vale se: status aprovado, valor == cobrança, cobrança ainda não paga.
export function canGrantAccess(p: { status: string; paidCents: number }, c: { priceCents: number; alreadyPaid: boolean }) {
  return p.status === "approved" && p.paidCents === c.priceCents && !c.alreadyPaid;
}
