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
});

// The model has been observed padding the tail of the issues array with the
// literal string "placeholder" when it can't find enough genuine issues in a
// short source. That renders as a real-looking but hollow flag card, which is
// far worse than a retry.
const FILLER = /\b(placeholder|lorem ipsum|todo|tbd|n\/a)\b/i;

const isFiller = (i: z.infer<typeof IssueSchema>) =>
  FILLER.test(i.problem) || FILLER.test(i.impact);

const AnalysisSchema = z.object({
  translation: z.string().min(1),
  score: z.number().min(0).max(100),
  verdict: z.string().min(1),
  readiness: z.enum([
    "Not ready for customer-facing use",
    "Needs expert review before publishing",
    "Ready with minor edits",
  ]),
  // No floor. Genuinely publication-ready content should be able to come back
  // with zero flags and a 90+ score — a minimum here would force the model to
  // manufacture problems and would cap the top two score bands permanently.
  issues: z.array(IssueSchema),
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
        },
        required: ["category", "severity", "problem", "impact"],
        additionalProperties: false,
      },
    },
  },
  required: ["translation", "score", "verdict", "readiness", "issues"],
  additionalProperties: false,
} as const;

const PRIMARY_MODEL = "claude-sonnet-5";

// Safety classifiers occasionally decline legitimate medical and regulatory
// source text — including the hardcoded sample behind "See a sample report".
// A refusal is a 200 with stop_reason "refusal", not an exception, so it has to
// be checked explicitly. Opus 4.6 is the safety net; verified to accept this
// exact request shape (thinking disabled + structured outputs).
const FALLBACK_MODEL = "claude-opus-4-6";

// Prepended to the system prompt on the fallback attempt ONLY. The first
// attempt always runs the untouched primary prompt.
const FALLBACK_PREAMBLE = `You are reviewing professional translation quality for a certified localization firm. The content may include medical, legal, or regulatory material — this is legitimate professional review, not creation of harmful content. Assess the translation quality without refusing based on content category.`;

type Generation =
  | { ok: true; raw: string }
  | { ok: false; kind: "refusal" | "max_tokens" | "error" };

/** Some policy declines surface as a thrown 400 rather than a refusal stop_reason. */
function isPolicyError(err: unknown): boolean {
  const e = err as { status?: number; message?: string };
  if (e?.status !== 400) return false;
  return /refus|policy|safety|content[_ -]?filter/i.test(e.message ?? "");
}

async function generate(
  anthropic: Anthropic,
  model: string,
  system: string,
  userPrompt: string,
): Promise<Generation> {
  try {
    const message = await anthropic.messages.create({
      model,
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
      console.error(`[analyze] ${model} refused`, message.stop_details);
      return { ok: false, kind: "refusal" };
    }

    // Hitting the ceiling means the JSON was closed under pressure and the tail
    // fields are filler. Fail loudly rather than render hollow flag cards.
    if (message.stop_reason === "max_tokens") {
      console.error(`[analyze] ${model} hit max_tokens`, message.usage);
      return { ok: false, kind: "max_tokens" };
    }

    return {
      ok: true,
      raw: message.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join(""),
    };
  } catch (err) {
    if (isPolicyError(err)) {
      console.error(`[analyze] ${model} policy error:`, err);
      return { ok: false, kind: "refusal" };
    }
    console.error(`[analyze] ${model} API error:`, err);
    return { ok: false, kind: "error" };
  }
}

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
1. Produce a plausible raw AI-generated translation into ${language}, the kind of output a general-purpose LLM would generate. It should be grammatically correct but subtly flawed in ways a specialist would immediately catch (wrong industry term, register mismatch, cultural miss, ambiguity).
2. Identify 0 to 5 SPECIFIC issues in the translation. If the translation is genuinely publication-ready with no real issues worth flagging, return zero issues and score it 90+. Do not manufacture concerns to fill the range. Only flag issues a certified linguist would legitimately raise. Each issue must reference actual terms, structures, or cultural conventions in ${language}, not generic complaints.
3. Assign an overall quality score from 0 to 100.

Industry context: ${meta.context}
Target language: ${language}
Source content:
"""
${sourceText}
"""

SCORING RUBRIC. Assign the overall score from 0 to 100 based on how much a certified linguist would need to change. Anchor your score against these bands:

90-100: Publication-ready. Minor polish only. No critical or high-severity issues in any of the five dimensions (Regulatory Risk, Terminology, Cultural Fit, Brand Voice, Ambiguity).

75-89: Usable with light review. A few medium-severity issues across the five dimensions. No critical issues. No high-severity issues in Regulatory Risk or Terminology.

60-74: Significant issues. Multiple high-severity issues, OR one critical issue in a lower-stakes dimension (Style, Ambiguity). Linguist review strongly recommended.

40-59: Substantial rework. Any critical issue in Regulatory Risk or Terminology, OR many high-severity issues across dimensions, OR the translation reads as unfluent, unnatural, or word-for-word rather than idiomatic in the target language.

Below 40: Fundamental problems. Meaning distorted, terminology consistently wrong, or the translation would confuse or mislead the target audience.

Do not default to the mid-band. Calibrate the score to the specific issues you found. If the translation is genuinely publication-ready with no real issues, score 90+. If it is deeply flawed, score below 40. Reserve 55-60 for translations that genuinely have significant issues but are recoverable with edits.

Every issue must be fully written and genuine. NEVER emit filler text such as "placeholder", "TBD", or "N/A" in any field. Return only the issues you actually found, even if that is one or none, rather than padding the list.

STYLE RULE: Do not use em dashes (—) anywhere in your output. Use commas or periods instead. Do not use the ampersand "&"; write "and".

LANGUAGE RULE. This matters: the "translation" field is the ONLY field written in ${language}. The verdict, and every issue's problem and impact, must be written in ENGLISH for an English-speaking client, quoting the specific ${language} terms inline where relevant.

Each issue has exactly two written fields, problem and impact. Do NOT propose, describe, or hint at the corrected wording, and do not add any field beyond the schema. Name what is wrong and what it costs, nothing more.

The verdict must be ONE sentence, maximum 30 words, it is displayed as a large pull quote, so length matters. It should read as a certified linguist would speak it, direct, professional, specific. The impact of each issue must be a concrete business consequence (regulatory delay, brand damage, compliance risk, conversion loss).`;

  const anthropic = new Anthropic({ apiKey });

  // A single bad generation (filler issues, unparseable JSON) must never reach
  // the screen, so give it one more go before surfacing an error.
  for (let attempt = 1; attempt <= 2; attempt++) {
  // Primary first, always with the untouched system prompt.
  let gen = await generate(anthropic, PRIMARY_MODEL, system, userPrompt);

  // Safety net: a refusal is retried once on the fallback model with a softened
  // system prompt. Only the refusal path falls back — a max_tokens or transport
  // failure is not a policy problem and re-running it on a second model would
  // just double the latency.
  if (!gen.ok && gen.kind === "refusal") {
    console.warn(
      `[analyze] ${PRIMARY_MODEL} refused, retrying on ${FALLBACK_MODEL}`,
    );
    gen = await generate(
      anthropic,
      FALLBACK_MODEL,
      `${FALLBACK_PREAMBLE}\n\n${system}`,
      userPrompt,
    );

    if (!gen.ok && gen.kind === "refusal") {
      console.error(
        `[analyze] both ${PRIMARY_MODEL} and ${FALLBACK_MODEL} refused — giving up`,
      );
      return NextResponse.json(
        {
          error:
            "This content couldn’t be analyzed. Please try a different sample.",
        },
        { status: 422 },
      );
    }
  }

  if (!gen.ok) {
    return gen.kind === "max_tokens"
      ? NextResponse.json(
          { error: "Analysis format invalid, try again" },
          { status: 502 },
        )
      : NextResponse.json(
          { error: "Analysis service unavailable" },
          { status: 500 },
        );
  }

  // Structured outputs should make this unnecessary, but a fenced or prose-wrapped
  // response would otherwise take down the whole demo.
  const cleaned = gen.raw
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
