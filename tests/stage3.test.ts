import { describe, it, expect } from "vitest";
import { parseAmountCents, centsToInput } from "../src/lib/finance/money";
import { shiftMonth, monthRange, parseMonth, isValidDate } from "../src/lib/dates";

describe("valores digitados", () => {
  it("aceita formatos brasileiros", () => {
    expect(parseAmountCents("1.234,56")).toBe(123456); expect(parseAmountCents("12,5")).toBe(1250);
    expect(parseAmountCents("12.50")).toBe(1250); expect(parseAmountCents("R$ 10")).toBe(1000); expect(parseAmountCents("-100,00")).toBe(-10000);
  });
  it("rejeita lixo", () => { for (const v of ["", "abc", "1e3", "12,345", "1,2,3"]) expect(parseAmountCents(v)).toBeNull(); });
  it("formata para o campo", () => expect(centsToInput(123456)).toBe("1234,56"));
});
describe("meses", () => {
  it("vira o ano", () => { expect(shiftMonth("2026-12", 1)).toBe("2027-01"); expect(shiftMonth("2026-01", -1)).toBe("2025-12"); });
  it("intervalo com fim exclusivo", () => expect(monthRange("2026-12")).toEqual({ start: "2026-12-01", end: "2027-01-01" }));
  it("mês inválido volta ao atual", () => expect(parseMonth("2026-13")).toMatch(/^\d{4}-\d{2}$/));
  it("datas", () => { expect(isValidDate("2026-02-29")).toBe(false); expect(isValidDate("2028-02-29")).toBe(true); });
});
