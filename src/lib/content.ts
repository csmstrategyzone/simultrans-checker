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

/** Maps a 0-100 score onto a threshold band. Every band recommends a review. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 90) {
    return {
      color: "#409A3C",
      fg: "#FFFFFF",
      label:
        "Very good AI translation. Real linguist review recommended for final polish.",
    };
  }
  if (score >= 75) {
    return {
      color: "#FFC222",
      fg: "#0F172A",
      label:
        "Notable issues found. Real linguist review strongly recommended before publishing.",
    };
  }
  if (score >= 60) {
    return {
      color: "#F7941D",
      fg: "#0F172A",
      label: "Significant issues. Real linguist review required.",
    };
  }
  return {
    color: "#DB5C3B",
    fg: "#FFFFFF",
    label:
      "Substantial rework needed. Do not publish without a real linguist review.",
  };
}
