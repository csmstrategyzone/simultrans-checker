import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { ReportDocument, type ReportData } from "@/lib/report-document";

// react-pdf needs the Node runtime; this handler always runs at request time.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IssueSchema = z.object({
  category: z.string(),
  severity: z.string(),
  problem: z.string(),
  impact: z.string(),
});

const BodySchema = z.object({
  analysis: z.object({
    translation: z.string(),
    score: z.number(),
    verdict: z.string(),
    readiness: z.string(),
    // No floor — a publication-ready analysis legitimately has zero flags.
    issues: z.array(IssueSchema),
  }),
  verticalLabel: z.string().min(1),
  language: z.string().min(1),
  sourceText: z.string().min(1),
  wordCount: z.number(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid report payload" },
      { status: 400 },
    );
  }

  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const data: ReportData = { ...parsed.data, date };

  try {
    // Call the component directly so we hand renderToBuffer the <Document>
    // element it expects, not a wrapping FunctionComponentElement.
    const buffer = await renderToBuffer(ReportDocument({ data }));

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="SimulTrans-AI-Preview-Report.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[report] PDF generation failed:", err);
    return NextResponse.json(
      { error: "Could not generate report" },
      { status: 500 },
    );
  }
}
