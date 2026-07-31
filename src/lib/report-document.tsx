import fs from "node:fs";
import path from "node:path";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  lowerVerticalLabel,
  scoreBand,
  SEVERITY_COLOR,
  WHAT_AI_CANNOT_CATCH,
} from "@/lib/content";
import {
  BODY_FONT,
  HEADING_FONT,
  LATIN_FALLBACK,
  MONO_FONT,
  registerFontForLanguage,
} from "@/lib/report-fonts";

/**
 * The data shape the /api/report/generate route hands to the PDF. Kept loose on
 * purpose — the route validates before calling in.
 */
export type ReportData = {
  analysis: {
    translation: string;
    score: number;
    verdict: string;
    readiness: string;
    issues: {
      category: string;
      severity: string;
      problem: string;
      impact: string;
    }[];
  };
  verticalLabel: string;
  language: string;
  sourceText: string;
  wordCount: number;
  date: string;
};

// SimulTrans palette.
const BLUE = "#00529B";
const GREEN = "#409A3C";
// Severity reds/golds now come from SEVERITY_COLOR; ORANGE is still used on its own.
const ORANGE = "#F7941D";
const INK = "#0F172A";
const MUTED = "#64748B";
const LINE = "#E2E8F0";
const SURFACE = "#F8FAFC";

// Severity colours come from lib/content so web and PDF stay in lockstep.
const SEVERITY = SEVERITY_COLOR;

/**
 * Official SimulTrans lockup, used unmodified — blue artwork on the white header
 * band, which is the natural brand rendering. The lockup already contains the
 * "your languages – your timeline" slogan as outlined art, so no slogan is typed
 * separately.
 *
 * Read off disk, so it must stay listed in outputFileTracingIncludes.
 */
const LOGO_PATH = path.join(
  process.cwd(),
  "public",
  "SimulTrans Logo for INBOUND25 512x328 transparent characters.png",
);

/**
 * Handed to <Image> as raw bytes, not a path: react-pdf treats a string `src`
 * as a URL and tries to fetch it, which fails silently for a local file and
 * renders an empty header band.
 */
let logoBytes: Buffer | null = null;
function logoSrc() {
  if (!logoBytes) logoBytes = fs.readFileSync(LOGO_PATH);
  return { data: logoBytes, format: "png" as const };
}

/**
 * The supplied PNG is a 512x328 canvas whose artwork only occupies y 103..224
 * and x 8..503 — i.e. it carries 103px of transparent padding above and below.
 * Sizing the *canvas* to 44pt would therefore draw a 16pt logo. These constants
 * scale the canvas so the visible artwork lands at LOGO_ART_HEIGHT and its left
 * edge sits exactly on the page's 40pt margin. The asset itself is untouched.
 */
const LOGO_CANVAS = { w: 512, h: 328 };
const LOGO_ART = { x: 8, y: 103, w: 496, h: 122 };

const PAGE_MARGIN = 40;
const HEADER_HEIGHT = 80;
const LOGO_ART_HEIGHT = 44;

/**
 * Breathing room between the header rule and the first piece of content.
 *
 * This lives on the header band's marginBottom rather than on the body's
 * paddingTop: the body is one View wrapping the whole report, so its padding is
 * only applied where that View starts (page 1). The header is `fixed` and so
 * re-renders on every page — hanging the gap off it is what keeps page 2 and
 * beyond from butting their first flag card straight against the rule.
 */
const HEADER_GAP = 32;

// Scale the whole canvas up so the artwork inside it measures LOGO_ART_HEIGHT.
const LOGO_RENDER_H = LOGO_ART_HEIGHT * (LOGO_CANVAS.h / LOGO_ART.h);
const LOGO_RENDER_W = LOGO_RENDER_H * (LOGO_CANVAS.w / LOGO_CANVAS.h);
// Offsets that put the artwork's left edge on the margin and centre it vertically.
const LOGO_LEFT = PAGE_MARGIN - (LOGO_ART.x / LOGO_CANVAS.w) * LOGO_RENDER_W;
const LOGO_TOP = (HEADER_HEIGHT - LOGO_RENDER_H) / 2;

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    fontFamily: BODY_FONT,
    fontSize: 10,
    color: INK,
  },
  // Letterhead treatment: white band, hairline blue rule, logo left-anchored to
  // the same 40pt margin every body section uses.
  headerBand: {
    height: HEADER_HEIGHT,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: BLUE,
    marginBottom: HEADER_GAP,
    position: "relative",
    overflow: "hidden",
  },
  logo: {
    position: "absolute",
    left: LOGO_LEFT,
    top: LOGO_TOP,
    width: LOGO_RENDER_W,
    height: LOGO_RENDER_H,
  },
  // No paddingTop — the header band's marginBottom owns that gap, so it applies
  // on continuation pages too.
  body: { paddingHorizontal: PAGE_MARGIN },
  disclaimer: {
    backgroundColor: SURFACE,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    padding: 10,
    borderRadius: 4,
    fontSize: 9,
    color: INK,
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: HEADING_FONT,
    fontWeight: 700,
    fontSize: 13,
    color: BLUE,
    marginBottom: 8,
    marginTop: 16,
  },
  // Two fixed 45% columns with the remaining 10% as the gutter, so the two
  // label/value stacks line up regardless of how long a value runs.
  metaGrid: { flexDirection: "row", justifyContent: "space-between" },
  metaCol: { width: "45%" },
  metaCell: { marginBottom: 10 },
  metaLabel: {
    fontFamily: HEADING_FONT,
    fontWeight: 600,
    fontSize: 8,
    color: BLUE,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  metaValue: { fontFamily: BODY_FONT, fontWeight: 400, fontSize: 12, color: INK },
  previewNote: {
    fontFamily: BODY_FONT,
    fontStyle: "italic",
    fontSize: 9,
    lineHeight: 1.5,
    color: MUTED,
    marginTop: 12,
  },
  contentBox: {
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 12,
    fontSize: 10,
    lineHeight: 1.5,
    color: INK,
  },
  scoreRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  scoreNum: { fontFamily: HEADING_FONT, fontWeight: 700, fontSize: 44 },
  scoreOf: { fontSize: 18, color: MUTED, marginLeft: 4 },
  bandBox: {
    flex: 1,
    marginLeft: 18,
    borderRadius: 6,
    padding: 12,
    justifyContent: "center",
  },
  bandLabel: {
    fontFamily: BODY_FONT,
    fontWeight: 700,
    fontSize: 10.5,
    lineHeight: 1.35,
  },
  issue: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 12,
  },
  issueHead: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  sevBadge: {
    fontSize: 7.5,
    fontFamily: BODY_FONT,
    fontWeight: 700,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
    textTransform: "uppercase",
    marginRight: 6,
  },
  category: {
    fontSize: 8,
    fontFamily: BODY_FONT,
    fontWeight: 600,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  aiTag: {
    fontSize: 7,
    color: BLUE,
    fontFamily: BODY_FONT,
    fontWeight: 700,
    marginLeft: 6,
    textTransform: "uppercase",
  },
  problem: {
    fontSize: 10,
    fontFamily: BODY_FONT,
    fontWeight: 700,
    marginBottom: 3,
  },
  metaLine: { fontSize: 9, color: MUTED, marginBottom: 1.5 },
  catchItem: { flexDirection: "row", marginBottom: 5 },
  catchDot: {
    color: ORANGE,
    marginRight: 6,
    fontFamily: BODY_FONT,
    fontWeight: 700,
  },
  catchText: { fontSize: 9.5, color: INK, flex: 1, lineHeight: 1.35 },
  cta: {
    backgroundColor: BLUE,
    borderRadius: 8,
    padding: 16,
    marginTop: 18,
  },
  ctaTitle: {
    fontFamily: HEADING_FONT,
    fontWeight: 700,
    fontSize: 13,
    color: "#FFFFFF",
  },
  ctaText: { fontSize: 9.5, color: "#FFFFFF", opacity: 0.9, marginTop: 5, lineHeight: 1.4 },
  // Mirrors the header's hairline rule, on the same 40pt margins as the body.
  footer: {
    position: "absolute",
    bottom: 24,
    left: PAGE_MARGIN,
    right: PAGE_MARGIN,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BLUE,
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: MUTED },
});

export function ReportDocument({ data }: { data: ReportData }) {
  const { analysis } = data;
  const band = scoreBand(analysis.score);

  // Registers (and returns) the face that can actually draw the target script.
  // Must happen before renderToBuffer walks the tree.
  const translationFont = registerFontForLanguage(data.language);

  /**
   * Font fallback stacks.
   *
   * The model quotes target-language terms inline inside otherwise-English
   * prose ("Replace with 'माध्यस्थम्' ..."), so any AI-authored field can hold
   * mixed scripts. Given a single family that lacks the glyph, react-pdf falls
   * back to Helvetica, which has no Devanagari/CJK/Arabic coverage and renders
   * those codepoints as Latin garbage. react-pdf resolves fontFamily arrays
   * per character, so listing the script face as a fallback fixes it.
   */
  const stack = (...families: string[]) => [...new Set(families)];
  const bodyStack = stack(BODY_FONT, translationFont, LATIN_FALLBACK);
  const monoStack = stack(MONO_FONT, translationFont, LATIN_FALLBACK);
  const scriptStack = stack(translationFont, BODY_FONT, LATIN_FALLBACK);

  return (
    <Document
      title="SimulTrans AI Preview Report"
      author="SimulTrans LLC"
    >
      {/* Page-level stack so any text not explicitly styled still inherits a
          script-capable fallback instead of dropping to Helvetica. */}
      <Page size="A4" style={[styles.page, { fontFamily: bodyStack }]} wrap>
        {/* Header band — official lockup as supplied, slogan included in the art. */}
        <View style={styles.headerBand} fixed>
          <Image style={styles.logo} src={logoSrc()} />
        </View>

        <View style={styles.body}>
          <Text style={styles.disclaimer}>
            This is an AI-generated preview. It does not replace a certified
            linguist review.
          </Text>

          {/* Metadata */}
          <Text style={styles.sectionTitle}>AI Translation Preview Report</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{data.date}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Source language</Text>
                <Text style={styles.metaValue}>English</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Word count</Text>
                <Text style={styles.metaValue}>{data.wordCount} words</Text>
              </View>
            </View>
            <View style={styles.metaCol}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Content type</Text>
                <Text style={[styles.metaValue, { fontFamily: bodyStack }]}>
                  {data.verticalLabel}
                </Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Target language</Text>
                <Text style={[styles.metaValue, { fontFamily: bodyStack }]}>
                  {data.language}
                </Text>
              </View>
            </View>
          </View>

          {/* Score + band */}
          <Text style={styles.sectionTitle}>AI quality preview score</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreNum, { color: band.color }]}>
              {analysis.score}
            </Text>
            <Text style={styles.scoreOf}>/100</Text>
            <View style={[styles.bandBox, { backgroundColor: band.color }]}>
              <Text style={[styles.bandLabel, { color: band.fg }]}>
                {band.label}
              </Text>
            </View>
          </View>

          {/* Same "examples, not certainty" note the web results page carries.
              Deliberately NOT on bodyStack: it is pure English, and react-pdf
              resolves the italic against every family in a stack — the script
              faces have no italic, which fails the whole render. */}
          <Text style={styles.previewNote}>
            These flags show examples of what a SimulTrans’ linguist would catch,
            not an exhaustive list. We can’t guarantee our linguists would fix
            each one exactly as shown. This is a preview to give you an idea. A
            certified linguist review is what catches everything.
          </Text>

          {/* Source content */}
          <Text style={styles.sectionTitle}>Original source content</Text>
          <View style={styles.contentBox}>
            <Text style={{ fontFamily: monoStack }}>{data.sourceText}</Text>
          </View>

          {/* AI-generated translation */}
          <Text style={styles.sectionTitle}>
            AI-generated translation ({data.language})
          </Text>
          <View style={styles.contentBox}>
            <Text style={{ fontFamily: scriptStack }}>
              {analysis.translation}
            </Text>
          </View>

          {/* Flags — heading matches the web results page verbatim. */}
          <Text style={styles.sectionTitle}>
            {analysis.issues.length > 0
              ? `${analysis.issues.length} Flags of what a SimulTrans’ linguist would look at`
              : "What a SimulTrans’ linguist would look at"}
          </Text>
          {analysis.issues.length === 0 && (
            <Text style={[styles.metaLine, { fontFamily: bodyStack }]}>
              The AI did not flag any issues in this translation. A certified
              linguist still checks brand voice, glossary consistency, and
              regulatory context that AI cannot see.
            </Text>
          )}
          {analysis.issues.map((issue, i) => {
            // ReportData keeps severity as a loose string (the route validates),
            // so narrow before indexing the shared map.
            const sev =
              SEVERITY[issue.severity as keyof typeof SEVERITY] ??
              SEVERITY.Medium;
            return (
              <View key={i} style={[styles.issue, { borderLeftColor: sev.bg }]} wrap={false}>
                <View style={styles.issueHead}>
                  <Text
                    style={[styles.sevBadge, { backgroundColor: sev.bg, color: sev.fg }]}
                  >
                    {issue.severity}
                  </Text>
                  <Text style={styles.category}>{issue.category}</Text>
                  <Text style={styles.aiTag}>AI Generated</Text>
                </View>
                <Text style={[styles.problem, { fontFamily: bodyStack }]}>
                  {issue.problem}
                </Text>
                <Text style={[styles.metaLine, { fontFamily: bodyStack }]}>
                  Impact: {issue.impact}
                </Text>
              </View>
            );
          })}

          {/* What only a real linguist can catch */}
          <Text style={styles.sectionTitle}>
            What only a real SimulTrans linguist can catch
          </Text>
          {WHAT_AI_CANNOT_CATCH.map((item) => (
            <View key={item} style={styles.catchItem}>
              <Text style={styles.catchDot}>!</Text>
              <Text style={styles.catchText}>{item}</Text>
            </View>
          ))}

          {/* CTA */}
          <View style={styles.cta} wrap={false}>
            <Text style={styles.ctaTitle}>
              Request a real linguist review from SimulTrans
            </Text>
            <Text style={styles.ctaText}>
              A certified {lowerVerticalLabel(data.verticalLabel)} linguist will review
              this content against everything AI cannot see. Contact us at
              info@simultrans.com or visit simultrans.com to request your review.
            </Text>
          </View>
        </View>

        {/* Footer on every page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>© Copyright 2026 SimulTrans LLC</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
