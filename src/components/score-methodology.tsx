/**
 * "How this score is calculated" – inline explainer on the results page.
 *
 * Sits directly below the score so the number is never read without the method
 * behind it. Distinct from the "How the SimulTrans Checker works" modal, which
 * explains what the tool is rather than how the number is produced.
 *
 * The five dimensions below mirror the `category` enum in /api/analyze, and the
 * severity labels mirror SEVERITY_COLOR in results.tsx. If either list changes,
 * change this copy with it.
 */

const DIMENSIONS = [
  {
    name: "Regulatory Risk",
    detail: "could this cause compliance or approval issues?",
  },
  {
    name: "Terminology",
    detail: "is domain-specific vocabulary used correctly?",
  },
  {
    name: "Cultural Fit",
    detail: "does it land appropriately for the target market?",
  },
  {
    name: "Brand Voice",
    detail: "does it match the intended tone and register?",
  },
  {
    name: "Ambiguity",
    detail: "could the meaning be misread?",
  },
];

export function ScoreMethodology() {
  return (
    <section
      id="score-methodology"
      className="mt-8 scroll-mt-24 rounded-2xl border border-line p-6 sm:p-8"
      style={{ background: "#F8FAFC" }}
    >
      <h3
        className="font-heading text-2xl leading-tight text-st-blue"
        style={{ fontWeight: 700 }}
      >
        How this score is calculated
      </h3>

      <p className="mt-3 max-w-[70ch] text-pretty text-[15px] leading-[1.6] text-ink">
        The SimulTrans Checker uses an AI model to review the translation across
        five quality dimensions:
      </p>

      <ul className="mt-4 space-y-2.5">
        {DIMENSIONS.map((d) => (
          <li
            key={d.name}
            className="flex gap-2.5 text-pretty text-[15px] leading-[1.5] text-ink"
          >
            <span
              aria-hidden="true"
              className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-st-blue"
            />
            <span>
              <span className="font-semibold">{d.name}</span>
              <span className="text-ink-muted"> – {d.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 max-w-[70ch] text-pretty text-[15px] leading-[1.6] text-ink">
        The AI produces a single overall score from 0 to 100 based on these
        dimensions, and flags individual issues with severity (Critical, High,
        Medium).
      </p>

      <p className="mt-4 max-w-[70ch] text-pretty text-[15px] leading-[1.6] text-ink-muted">
        This is an AI preview. A certified SimulTrans linguist would identify
        additional issues, especially in cultural nuance, brand voice, and
        industry-specific terminology that AI cannot reliably catch.
      </p>
    </section>
  );
}
