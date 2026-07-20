import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isSupportedLanguage } from "@/lib/languages";
import { countWords, MAX_WORDS } from "@/lib/words";

const VERTICALS = ["medical", "legal", "marketing", "software"] as const;

const RequestSchema = z.object({
  vertical: z.enum(VERTICALS),
  // Validated against the shared language list below, so the two never drift.
  language: z.string().min(1).refine(isSupportedLanguage, "Unsupported language"),
  sourceText: z
    .string()
    .trim()
    .min(3)
    .max(4000)
    .refine(
      (s) => countWords(s) <= MAX_WORDS,
      `Please reduce to ${MAX_WORDS} words or fewer to analyze`,
    ),
});

const IssueSchema = z.object({
  category: z.enum([
    "Regulatory Risk",
    "Terminology",
    "Cultural Fit",
    "Brand Voice",
    "Ambiguity",
  ]),
  severity: z.enum(["Critical", "High", "Medium"]),
  problem: z.string(),
  impact: z.string(),
  fix: z.string(),
});

// The model has been observed padding the tail of the issues array with the
// literal string "placeholder" when it can't find enough genuine issues in a
// short source. That renders as a real-looking but hollow flag card, which is
// far worse than a retry.
const FILLER = /\b(placeholder|lorem ipsum|todo|tbd|n\/a)\b/i;

const isFiller = (i: z.infer<typeof IssueSchema>) =>
  FILLER.test(i.problem) || FILLER.test(i.impact) || FILLER.test(i.fix);

const AnalysisSchema = z.object({
  translation: z.string().min(1),
  score: z.number().min(0).max(100),
  verdict: z.string().min(1),
  readiness: z.enum([
    "Not ready for customer-facing use",
    "Needs expert review before publishing",
    "Ready with minor edits",
  ]),
  issues: z
    .array(IssueSchema)
    // Filler is stripped before we get here; if fewer than 2 genuine issues
    // survive, the analysis isn't worth showing.
    .min(2, "fewer than 2 genuine issues after stripping filler"),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type Issue = z.infer<typeof IssueSchema>;

const verticalMeta = {
  medical: {
    label: "Medical and Pharma",
    context:
      "MDR / IVDR / FDA regulatory language, medical device instructions, pharmaceutical safety information",
  },
  legal: {
    label: "Legal",
    context:
      "contracts, terms of service, compliance clauses, arbitration provisions",
  },
  marketing: {
    label: "Marketing and Brand",
    context: "web copy, campaign creative, promotional content, brand voice",
  },
  software: {
    label: "Software and SaaS",
    context:
      "product UI strings, error messages, in-app documentation, developer docs",
  },
} as const;

// The model is constrained to this shape, so it cannot return prose or fenced JSON.
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    translation: { type: "string" },
    score: { type: "integer" },
    verdict: { type: "string" },
    readiness: {
      type: "string",
      enum: [
        "Not ready for customer-facing use",
        "Needs expert review before publishing",
        "Ready with minor edits",
      ],
    },
    issues: {
      // No minItems/maxItems — structured outputs rejects array constraints
      // above 1. The 3–5 range is enforced by the prompt and validated by Zod.
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "Regulatory Risk",
              "Terminology",
              "Cultural Fit",
              "Brand Voice",
              "Ambiguity",
            ],
          },
          severity: {
            type: "string",
            enum: ["Critical", "High", "Medium"],
          },
          problem: { type: "string" },
          impact: { type: "string" },
          fix: { type: "string" },
        },
        required: ["category", "severity", "problem", "impact", "fix"],
        additionalProperties: false,
      },
    },
  },
  required: ["translation", "score", "verdict", "readiness", "issues"],
  additionalProperties: false,
} as const;

// Naive in-memory limiter — resets on every server restart, and is per-instance.
// Replace with a shared store before this goes anywhere real.
const RATE_LIMIT = 20;
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

const LOCAL_IPS = new Set(["local", "127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** Never throttle the demo machine. */
function exemptFromRateLimit(ip: string): boolean {
  return process.env.NODE_ENV === "development" || LOCAL_IPS.has(ip);
}

function rateLimited(ip: string): boolean {
  if (exemptFromRateLimit(ip)) return false;
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[analyze] ANTHROPIC_API_KEY is not set");
    return NextResponse.json(
      { error: "Analysis service unavailable" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: `${first.path.join(".") || "request"}: ${first.message}` },
      { status: 400 },
    );
  }

  // Only well-formed requests count against the quota — a typo shouldn't cost
  // the user an analysis.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "local";

  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { vertical, language, sourceText } = parsed.data;
  const meta = verticalMeta[vertical];

  const system = `You are a senior linguistic quality specialist at SimulTrans, a US-headquartered localization firm with 40 years of expertise in ${meta.label} translation. You review AI-generated translations for enterprise clients and flag issues that could cost them regulatory approvals, brand equity, or customer trust.`;

  const userPrompt = `Analyze this English source content and produce a rigorous linguist review.

Task:
1. Produce a plausible raw AI machine translation into ${language}, the kind of output a general-purpose LLM would generate. It should be grammatically correct but subtly flawed in ways a specialist would immediately catch (wrong industry term, register mismatch, cultural miss, ambiguity).
2. Identify 3 to 5 SPECIFIC issues a certified ${meta.label} linguist would flag in that translation. Each issue must reference actual terms, structures, or cultural conventions in ${language}, not generic complaints.
3. Assign an overall quality score from 0 to 100.

Industry context: ${meta.context}
Target language: ${language}
Source content:
"""
${sourceText}
"""

Every issue must be fully written and genuine. NEVER emit filler text such as "placeholder", "TBD", or "N/A" in any field. If you can only find three real issues, return exactly three rather than padding the list.

STYLE RULE: Do not use em dashes (—) anywhere in your output. Use commas or periods instead. Do not use the ampersand "&"; write "and".

LANGUAGE RULE – this matters: the "translation" field is the ONLY field written in ${language}. The verdict, and every issue's problem, impact, and fix, must be written in ENGLISH for an English-speaking client, quoting the specific ${language} terms inline where relevant.

The verdict must be ONE sentence, maximum 30 words, it is displayed as a large pull quote, so length matters. It should read as a certified linguist would speak it, direct, professional, specific. The impact of each issue must be a concrete business consequence (regulatory delay, brand damage, compliance risk, conversion loss). The fix must be what a certified linguist would do instead, specific and actionable.`;

  const anthropic = new Anthropic({ apiKey });

  // A single bad generation (filler issues, too few issues) must never reach the
  // screen, so give it one more go before surfacing an error.
  for (let attempt = 1; attempt <= 2; attempt++) {
  let raw: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-5",
      // Generous headroom. Under structured outputs the decoder MUST emit valid
      // JSON, so a run that approaches the ceiling pads its trailing fields with
      // filler ("placeholder") rather than truncating — which renders as a real
      // but empty flag card. Budget is cheaper than a hollow result on stage.
      max_tokens: 8000,
      // Sonnet 5 runs adaptive thinking when `thinking` is omitted, and thinking
      // tokens count against max_tokens. Off keeps the demo fast and the budget
      // entirely available for the JSON.
      thinking: { type: "disabled" },
      system,
      messages: [{ role: "user", content: userPrompt }],
      output_config: {
        format: {
          type: "json_schema",
          schema: OUTPUT_SCHEMA,
        },
      },
    });

    if (message.stop_reason === "refusal") {
      console.error("[analyze] model refused", message.stop_details);
      return NextResponse.json(
        { error: "Analysis format invalid, try again" },
        { status: 502 },
      );
    }

    // Hitting the ceiling means the JSON was closed under pressure and the tail
    // fields are filler. Fail loudly rather than render hollow flag cards.
    if (message.stop_reason === "max_tokens") {
      console.error("[analyze] hit max_tokens — output would be padded", message.usage);
      return NextResponse.json(
        { error: "Analysis format invalid, try again" },
        { status: 502 },
      );
    }

    raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch (err) {
    console.error("[analyze] Anthropic API error:", err);
    return NextResponse.json(
      { error: "Analysis service unavailable" },
      { status: 500 },
    );
  }

  // Structured outputs should make this unnecessary, but a fenced or prose-wrapped
  // response would otherwise take down the whole demo.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    console.error(
      `[analyze] attempt ${attempt}: model did not return JSON:`,
      cleaned.slice(0, 300),
    );
    continue;
  }

  // Drop any padded issues before validating — on short sources the model can
  // only find 2-3 genuine problems and invents the rest to satisfy "3 to 5".
  // Three real flags beat five with two hollow ones.
  if (json && typeof json === "object" && Array.isArray((json as Analysis).issues)) {
    const all = (json as Analysis).issues;
    const genuine = all.filter((i) => !isFiller(i));
    if (genuine.length !== all.length) {
      console.warn(
        `[analyze] attempt ${attempt}: stripped ${all.length - genuine.length} filler issue(s)`,
      );
      (json as Analysis).issues = genuine;
    }
  }

  const analysis = AnalysisSchema.safeParse(json);
  if (!analysis.success) {
    console.error(
      `[analyze] attempt ${attempt}: rejected —`,
      analysis.error.issues.map((i) => i.message).join("; "),
    );
    continue;
  }

  return NextResponse.json(analysis.data, { status: 200 });
  }

  console.error("[analyze] both attempts failed validation");
  return NextResponse.json(
    { error: "Analysis format invalid, try again" },
    { status: 502 },
  );
}
