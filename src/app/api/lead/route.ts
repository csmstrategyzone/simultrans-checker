import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const LeadSchema = z.object({
  email: z.string().email("Enter a valid work email"),
  name: z.string().trim().min(2, "Enter your full name"),
  company: z.string().trim().min(2, "Enter your company"),
  challenge: z.string().max(2000).optional(),

  // Analysis context, so the account manager opens the thread already informed.
  analysis: z
    .object({
      score: z.number(),
      readiness: z.string(),
      vertical: z.string(),
      language: z.string(),
      sourceText: z.string(),
    })
    .optional(),
});

export type LeadInput = z.infer<typeof LeadSchema>;

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

  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".") || "request"}: ${first.message}` },
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

  const lead = parsed.data;

  console.log("🎯 LEAD CAPTURED");
  console.log(JSON.stringify(lead, null, 2));

  // TODO: wire HubSpot Contacts API here.
  //   POST https://api.hubapi.com/crm/v3/objects/contacts
  //   Authorization: Bearer ${process.env.HUBSPOT_TOKEN}
  //   properties: { email, firstname, lastname, company,
  //                 st_score, st_readiness, st_vertical, st_language }
  //   Failures here must NOT surface to the user — queue and retry instead;
  //   a lost lead is worse than a slow one.

  return NextResponse.json(
    { ok: true, message: "Thanks. We’ll be in touch." },
    { status: 200 },
  );
}
