import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import { scoreBand, WHAT_AI_CANNOT_CATCH } from "@/lib/content";
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
      fix: string;
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
const RED = "#DB5C3B";
const ORANGE = "#F7941D";
const GOLD = "#FFC222";
const INK = "#0F172A";
const MUTED = "#64748B";
const LINE = "#E2E8F0";
const SURFACE = "#F8FAFC";

const SEVERITY: Record<string, { bg: string; fg: string }> = {
  Critical: { bg: RED, fg: "#FFFFFF" },
  High: { bg: ORANGE, fg: "#0F172A" },
  Medium: { bg: GOLD, fg: "#0F172A" },
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 56,
    fontFamily: BODY_FONT,
    fontSize: 10,
    color: INK,
  },
  headerBand: {
    backgroundColor: BLUE,
    paddingVertical: 22,
    paddingHorizontal: 40,
    alignItems: "flex-start",
  },
  brand: {
    fontFamily: HEADING_FONT,
    fontWeight: 700,
    fontSize: 28,
    lineHeight: 1,
    color: "#FFFFFF",
  },
  slogan: {
    fontFamily: BODY_FONT,
    fontWeight: 400,
    fontSize: 9,
    lineHeight: 1,
    color: "#FFFFFF",
    opacity: 0.7,
    // react-pdf letterSpacing is in points, not em. 0.15em at 9pt = 1.35pt.
    letterSpacing: 1.35,
    marginTop: 4,
  },
  body: { paddingHorizontal: 40, paddingTop: 20 },
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
  metaGrid: { flexDirection: "row", flexWrap: "wrap" },
  metaCell: { width: "50%", marginBottom: 6 },
  metaLabel: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  metaValue: { fontSize: 10, color: INK },
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
  fixLine: { fontSize: 9, color: INK, marginBottom: 1.5 },
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
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
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
        {/* Header band */}
        <View style={styles.headerBand} fixed>
          <Text style={styles.brand}>SimulTrans</Text>
          <Text style={styles.slogan}>your languages – your timeline</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.disclaimer}>
            This is an AI-generated preview. It does not replace a certified
            linguist review.
          </Text>

          {/* Metadata */}
          <Text style={styles.sectionTitle}>AI Translation Preview Report</Text>
          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{data.date}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Content type</Text>
              <Text style={styles.metaValue}>{data.verticalLabel}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Source language</Text>
              <Text style={styles.metaValue}>English</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Target language</Text>
              <Text style={styles.metaValue}>{data.language}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Word count</Text>
              <Text style={styles.metaValue}>{data.wordCount} words</Text>
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

          {/* Source content */}
          <Text style={styles.sectionTitle}>Original source content</Text>
          <View style={styles.contentBox}>
            <Text style={{ fontFamily: monoStack }}>{data.sourceText}</Text>
          </View>

          {/* Machine translation */}
          <Text style={styles.sectionTitle}>
            AI machine translation ({data.language})
          </Text>
          <View style={styles.contentBox}>
            <Text style={{ fontFamily: scriptStack }}>
              {analysis.translation}
            </Text>
          </View>

          {/* AI preview of a linguist review */}
          <Text style={styles.sectionTitle}>
            AI preview of a linguist review ({analysis.issues.length} flags)
          </Text>
          {analysis.issues.map((issue, i) => {
            const sev = SEVERITY[issue.severity] ?? SEVERITY.Medium;
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
                <Text style={[styles.fixLine, { fontFamily: bodyStack }]}>
                  Fix: {issue.fix}
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
              A certified {data.verticalLabel.toLowerCase()} linguist will review
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
