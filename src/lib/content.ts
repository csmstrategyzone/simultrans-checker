/**
 * Shared copy and scoring bands used by the results screen, the "What AI cannot
 * catch" section, and the PDF report — so all three always agree.
 */

export const WHAT_AI_CANNOT_CATCH: string[] = [
  "Your brand voice history across all past translations",
  "Industry-specific terminology only your subject matter experts know",
  "Regulatory context specific to your target market (medical, legal, financial)",
  "Client and stakeholder preferences documented over years of relationships",
  "Cultural nuance in specific regional markets (not just language, but market context)",
  "Consistency with your existing translation memory and glossaries",
];

export type ScoreBand = {
  /** SimulTrans brand color for the band background. */
  color: string;
  /** Readable text color on that background. */
  fg: string;
  /** Always recommends a real linguist review — never a "safe to publish". */
  label: string;
};

/**
 * The five score bands. Thresholds and wording mirror the SCORING RUBRIC in the
 * /api/analyze user prompt and the band list in ScoreMethodology — if any one of
 * the three changes, change all three or the number stops meaning what we say it
 * means. Brand palette only, ordered green → red by severity.
 */
export const SCORE_BANDS: (ScoreBand & { min: number; name: string })[] = [
  {
    min: 90,
    name: "Publication-ready",
    color: "#409A3C",
    fg: "#FFFFFF",
    label:
      "Publication-ready. Real linguist review recommended for final polish.",
  },
  {
    min: 75,
    name: "Light review",
    color: "#60B070",
    fg: "#0F172A",
    label:
      "Usable with light review. Real linguist review recommended before publishing.",
  },
  {
    min: 60,
    name: "Significant issues",
    color: "#FFC222",
    fg: "#0F172A",
    label:
      "Significant issues. Real linguist review strongly recommended before publishing.",
  },
  {
    min: 40,
    name: "Substantial rework",
    color: "#F7941D",
    fg: "#0F172A",
    label:
      "Substantial rework needed. Do not publish without a real linguist review.",
  },
  {
    min: 0,
    name: "Fundamental problems",
    color: "#DB5C3B",
    fg: "#FFFFFF",
    label:
      "Fundamental problems. Do not publish. A real linguist review is essential.",
  },
];

/** Maps a 0-100 score onto a threshold band. Every band recommends a review. */
export function scoreBand(score: number): ScoreBand {
  // Bands are ordered high to low, so the first match is the right one.
  return SCORE_BANDS.find((b) => score >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}
