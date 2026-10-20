import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/billing/plans";

function validSignature(signature: string | null, requestId: string | null, paymentId: string, secret: string) {
  if (!signature) return false;
  const parts = Object.fromEntries(signature.split(",").map((part) => {
    const [key, ...value] = part.trim().split("=");
    return [key, value.join("=")];
  }));
  if (!parts.ts || !parts.v1) return false;
  const fields = [`id:${paymentId.toLowerCase()}`, requestId ? `request-id:${requestId}` : "", `ts:${parts.ts}`].filter(Boolean);
  const manifest = fields.join(";") + ";";
  const expected = createHmac("sha256", secret).update(manifest).digest();
  let received: Buffer;
  try { received = Buffer.from(parts.v1, "hex"); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("data.id") ?? url.searchParams.get("id");
  const type = url.searchParams.get("type");
  const secret = process.env.MP_WEBHOOK_SECRET;
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!secret || !accessToken || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  if (!paymentId || (type && type !== "payment")) return NextResponse.json({ ok: true });
  if (!validSignature(request.headers.get("x-signature"), request.headers.get("x-request-id"), paymentId, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let providerResponse: Response;
  try {
    providerResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(15000),
    });
  } catch {
    return NextResponse.json({ error: "Provider unavailable" }, { status: 503 });
  }
  if (!providerResponse.ok) return NextResponse.json({ error: "Could not verify payment" }, { status: 503 });
  const payment = await providerResponse.json();
  const chargeId = String(payment.external_reference ?? "");
  const metadata = payment.metadata ?? {};
  if (!chargeId || String(payment.id) !== paymentId || metadata.charge_id !== chargeId) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const { data: charge } = await admin.from("charges")
    .select("id,user_id,plan,amount_cents,status,provider_payment_id")
    .eq("id", chargeId).eq("provider", "mercadopago").maybeSingle();
  if (!charge || metadata.user_id !== charge.user_id || metadata.plan !== charge.plan || !(charge.plan in PLANS)) {
    return NextResponse.json({ ok: true });
  }
  const expectedCents = PLANS[charge.plan as PlanId].priceCents;
  const paidCents = Math.round(Number(payment.transaction_amount) * 100);
  if (payment.currency_id !== "BRL" || paidCents !== expectedCents || Number(charge.amount_cents) !== expectedCents ||
      (charge.provider_payment_id && charge.provider_payment_id !== paymentId)) {
    return NextResponse.json({ ok: true });
  }

  let nextStatus: string | null = null;
  if (payment.status === "approved" && payment.date_approved) nextStatus = "approved";
  else if (payment.status === "rejected") nextStatus = "rejected";
  else if (payment.status === "cancelled") nextStatus = "cancelled";
  else if (payment.status === "refunded") nextStatus = "refunded";
  if (!nextStatus) return NextResponse.json({ ok: true });

  const allowedFrom = nextStatus === "refunded" ? "approved" : "pending";
  const update: Record<string, unknown> = { status: nextStatus, provider_payment_id: paymentId };
  if (nextStatus === "approved") update.paid_at = payment.date_approved;
  const { error } = await admin.from("charges").update(update)
    .eq("id", charge.id).eq("status", allowedFrom);
  if (error) return NextResponse.json({ error: "Could not update charge" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
