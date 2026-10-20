const RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const todayISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
export const currentMonth = () => todayISO().slice(0, 7);
export const parseMonth = (s?: string) => (s && RE.test(s) ? s : currentMonth());
export function shiftMonth(key: string, delta: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export const monthRange = (key: string) => ({ start: `${key}-01`, end: `${shiftMonth(key, 1)}-01` }); // fim exclusivo
export const monthLabel = (key: string) => new Date(`${key}-01T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
export const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
export const formatDateBR = (iso: string) => iso.split("-").reverse().join("/");
export const qs = (o: Record<string, string | undefined>) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => v && u.set(k, v)); return u.toString(); };
