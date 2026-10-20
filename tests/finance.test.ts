import { describe, it, expect } from "vitest";
import { accountBalance, monthTotals, Tx } from "../src/lib/finance/balance";
import { splitInstallments, toCents } from "../src/lib/finance/money";
import { addOneMonth, nextPeriod, subscriptionStatus, canGrantAccess, PLANS } from "../src/lib/billing/plans";

describe("saldo", () => {
  const txs: Tx[] = [
    { kind: "income", amountCents: 300000, accountId: "A" },
    { kind: "expense", amountCents: 5000, accountId: "A" },
    { kind: "expense", amountCents: 20000, accountId: null, cardId: "C" },
    { kind: "invoice_payment", amountCents: 20000, accountId: "A" },
    { kind: "transfer_out", amountCents: 10000, accountId: "A" },
    { kind: "goal_deposit", amountCents: 7000, accountId: "A" },
  ];
  it("calcula saldo da conta", () => expect(accountBalance(1000, txs)).toBe(1000 + 300000 - 5000 - 20000 - 10000 - 7000));
  it("fatura não duplica despesa; transferência e meta não são consumo", () =>
    expect(monthTotals(txs)).toEqual({ income: 300000, expense: 25000 }));
});
describe("dinheiro", () => {
  it("parcelas somam o total", () => { const p = splitInstallments(10000, 3); expect(p.reduce((a, b) => a + b)).toBe(10000); expect(p).toEqual([3334, 3333, 3333]); });
  it("converte reais", () => { expect(toCents("1.234,56")).toBe(123456); expect(toCents(9.99)).toBe(999); });
});
describe("assinatura", () => {
  it("31/jan -> 28/fev", () => expect(addOneMonth(new Date("2027-01-31T12:00:00Z")).toISOString()).toBe("2027-02-28T12:00:00.000Z"));
  it("renovação antecipada soma ao vencimento", () => {
    const end = new Date("2026-11-10T00:00:00Z");
    expect(nextPeriod(new Date("2026-11-05T00:00:00Z"), end).end.toISOString()).toBe("2026-12-10T00:00:00.000Z");
  });
  it("expira e avisa", () => {
    const now = new Date("2026-11-10T00:00:00Z");
    expect(subscriptionStatus(new Date("2026-11-09T00:00:00Z"), now)).toBe("expired");
    expect(subscriptionStatus(new Date("2026-11-12T00:00:00Z"), now)).toBe("pending_renewal");
  });
  it("pendente/valor errado/duplicado não liberam", () => {
    const c = { priceCents: PLANS.max.priceCents, alreadyPaid: false };
    expect(canGrantAccess({ status: "pending", paidCents: 1599 }, c)).toBe(false);
    expect(canGrantAccess({ status: "approved", paidCents: 999 }, c)).toBe(false);
    expect(canGrantAccess({ status: "approved", paidCents: 1599 }, { ...c, alreadyPaid: true })).toBe(false);
    expect(canGrantAccess({ status: "approved", paidCents: 1599 }, c)).toBe(true);
  });
});
