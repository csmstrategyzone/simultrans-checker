import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * The email gate behind the PDF download and the Critical/High issue details.
 *
 * Distinct from /api/lead: that route carries the visitor's pasted sourceText
 * and so logs nothing. Here the payload is only what the visitor typed into the
 * gate form — an opt-in submission — so logging the address is fine and does not
 * touch the "nothing you paste is stored" promise.
 */
const CaptureSchema = z.object({
  email: z
    .string()
    .trim()
    // Deliberately permissive: this is a soft gate, not an identity check.
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Enter a valid email address"),
  name: z.string().trim().max(120).optional(),
});

export type CaptureEmailInput = z.infer<typeof CaptureSchema>;

const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();
const LOCAL_IPS = new Set(["local", "127.0.0.1", "::1", "::ffff:127.0.0.1"]);

function rateLimited(ip: string): boolean {
  if (process.env.NODE_ENV === "development" || LOCAL_IPS.has(ip)) return false;
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CaptureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "local";

  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  console.log(`Email captured: ${parsed.data.email}`);

  // TODO: Forward to HubSpot Contacts API when token arrives
  //   POST https://api.hubapi.com/crm/v3/objects/contacts
  //   Authorization: Bearer ${process.env.HUBSPOT_TOKEN}
  //   properties: { email, firstname }
  //   A HubSpot failure must not block the unlock — capture, queue, retry.

  return NextResponse.json({ ok: true }, { status: 200 });
}
