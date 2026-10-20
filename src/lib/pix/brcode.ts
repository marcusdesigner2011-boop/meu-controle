const encoder = new TextEncoder();

function field(id: string, value: string): string {
  const length = encoder.encode(value).length;
  if (length > 99) throw new Error(`Pix field ${id} is too long`);
  return `${id}${String(length).padStart(2, "0")}${value}`;
}

export function normalizePixLabel(value: string, maxLength: number): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ").trim().replace(/\s+/g, " ")
    .toUpperCase().slice(0, maxLength);
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (const byte of encoder.encode(payload)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function createPixBrCode({ key, holder, city, amountCents, transactionId }: {
  key: string;
  holder: string;
  city: string;
  amountCents: number;
  transactionId: string;
}): string {
  const name = normalizePixLabel(holder, 25);
  const merchantCity = normalizePixLabel(city, 15);
  const txid = transactionId.replace(/[^a-fA-F0-9]/g, "").slice(0, 25).toUpperCase();
  if (!key.trim() || !name || !merchantCity || !txid || !Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Incomplete Pix QR details");
  }
  const amount = `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`;
  const merchantAccount = field("00", "br.gov.bcb.pix") + field("01", key.trim());
  const additionalData = field("05", txid);
  const payload = field("00", "01") + field("01", "11") + field("26", merchantAccount)
    + field("52", "0000") + field("53", "986") + field("54", amount)
    + field("58", "BR") + field("59", name) + field("60", merchantCity)
    + field("62", additionalData) + "6304";
  return `${payload}${crc16(payload)}`;
}
