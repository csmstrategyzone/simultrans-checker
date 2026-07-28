"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, FileText } from "lucide-react";
import { ReviewProgress, type ReviewStatus } from "@/components/review-progress";
import { Results } from "@/components/results";
import { LanguageCombobox } from "@/components/language-combobox";
import type { Analysis } from "@/app/api/analyze/route";
import { VerticalCard } from "@/components/vertical-card";
import { countWords, MAX_WORDS } from "@/lib/words";

export type VerticalId = "medical" | "legal" | "marketing" | "software";

export const VERTICALS: {
  id: VerticalId;
  label: string;
  sublabel: string;
  sample: string;
}[] = [
  {
    id: "medical",
    label: "Medical and Pharma",
    sublabel: "MDR · IVDR · FDA",
    sample:
      "Do not use if the patient exhibits signs of hypersensitivity to any component. Discontinue treatment immediately if severe reactions occur and seek emergency medical assistance. This device may cause tissue damage if used incorrectly.",
  },
  {
    id: "legal",
    label: "Legal",
    sublabel: "Contracts · Terms · Compliance",
    sample:
      "The parties agree that any dispute arising from this Agreement shall be resolved through binding arbitration in accordance with the rules of the International Chamber of Commerce. This provision shall survive termination of this Agreement.",
  },
  {
    id: "marketing",
    label: "Marketing and Brand",
    sublabel: "Web · Campaigns · Promotional copy",
    sample:
      "Break through the noise with content that connects. Our AI-powered platform helps growth teams move faster than ever, turning insight into action in seconds, not weeks.",
  },
  {
    id: "software",
    label: "Software and SaaS",
    sublabel: "UI · Docs · Product",
    sample:
      "Unable to complete this action. Please check your permissions and try again. If the problem persists, contact your workspace administrator or reach out to our support team for assistance.",
  },
];

/** Nobody wants to read a raw validation string on a demo screen. */
function humanError(status: number, serverMsg?: string): string {
  if (status === 429)
    return "Too many analyses in a short time. Give it a minute?";
  if (status === 502) return "Something went sideways on our end. Try again?";
  if (status >= 500)
    return "Our analysis service is having a moment. Try again?";
  // 400s are the user's to fix, so surface exactly what was wrong.
  return serverMsg ?? "Something went wrong. Try again.";
}

export type ToolCardHandle = {
  /** Hero's "See a sample report": load the Medical sample and fire Analyze. */
  loadSampleAndAnalyze: () => void;
};

export const ToolCard = forwardRef<ToolCardHandle>(function ToolCard(_, ref) {
  const [vertical, setVertical] = useState<VerticalId>("medical");
  const [language, setLanguage] = useState("German");
  const [sourceText, setSourceText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sampleLoaded, setSampleLoaded] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Analysis | null>(null);
  const [status, setStatus] = useState<ReviewStatus>("running");
  const [reviewing, setReviewing] = useState(false);

  const reduced = useReducedMotion();

  // The last payload analyzed, so Retry re-runs the same request.
  const lastRun = useRef({ vertical, language, sourceText });

  const analyze = async (
    v: VerticalId = vertical,
    l: string = language,
    s: string = sourceText,
  ) => {
    if (!s.trim() || countWords(s) > MAX_WORDS) return;
    lastRun.current = { vertical: v, language: l, sourceText: s };

    setLoading(true);
    setError(null);
    setResult(null);
    setStatus("running");
    setReviewing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vertical: v, language: l, sourceText: s }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(humanError(res.status, data?.error));
        setStatus("error");
        setLoading(false);
        return;
      }

      // Hold `loading` until the progress panel finishes its final checkmark —
      // it hands back via onSettled.
      setResult(data as Analysis);
      setStatus("done");
    } catch {
      setError("Couldn’t reach the analysis service. Check your connection.");
      setStatus("error");
      setLoading(false);
    }
  };

  const settle = useCallback(() => {
    setReviewing(false);
    setLoading(false);
  }, []);

  const retry = () => {
    const { vertical: v, language: l, sourceText: s } = lastRun.current;
    void analyze(v, l, s);
  };

  /** "Run another analysis" — back to a clean tool, scrolled to the top. */
  const reset = () => {
    setResult(null);
    setError(null);
    setReviewing(false);
    setLoading(false);
    setSourceText("");
    setSampleLoaded(false);
    setVertical("medical");
    setLanguage("German");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loadSample = (v: VerticalId = vertical) => {
    const sample = VERTICALS.find((x) => x.id === v)!.sample;
    setSourceText(sample);
    setSampleLoaded(true);
    return sample;
  };

  useImperativeHandle(ref, () => ({
    loadSampleAndAnalyze() {
      setVertical("medical");
      const sample = loadSample("medical");
      analyze("medical", language, sample);
    },
  }));

  /** Arrow keys move selection within the radiogroup, wrapping at both ends. */
  const onVerticalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();

    const i = VERTICALS.findIndex((v) => v.id === vertical);
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const next =
      (i + (forward ? 1 : -1) + VERTICALS.length) % VERTICALS.length;

    selectVertical(VERTICALS[next].id);
    e.currentTarget
      .querySelector<HTMLButtonElement>(
        `[data-vertical="${VERTICALS[next].id}"]`,
      )
      ?.focus();
  };

  const selectVertical = (id: VerticalId) => {
    setVertical(id);
    setResult(null);
    setError(null);
    // A sample from the previous vertical would be misleading here.
    if (sampleLoaded) {
      setSourceText("");
      setSampleLoaded(false);
    }
  };

  const clear = () => {
    setSourceText("");
    setSampleLoaded(false);
    setResult(null);
    setError(null);
  };

  const words = countWords(sourceText);
  const overLimit = words > MAX_WORDS;
  const canAnalyze = sourceText.trim().length > 0 && !overLimit && !loading;

  // "127 / 300 words" — green under 250, gold 250-299, orange at/over 300.
  const counterColor =
    words >= MAX_WORDS
      ? "#F7941D"
      : words >= 250
        ? "#FFC222"
        : "#409A3C";

  const activeVertical = VERTICALS.find((v) => v.id === vertical)!;

  return (
    <>
      <motion.div
        id="tool"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-5xl scroll-mt-24 rounded-2xl border border-line bg-white p-6 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.25)] sm:p-12"
      >
        {/* ── 01 CONTENT TYPE ─────────────────────────────────── */}
        <section>
          <h2 className="step-label">
            <span className="step-num">01</span>
            Choose your content type
          </h2>

          <div
            role="radiogroup"
            aria-label="Content type"
            onKeyDown={onVerticalKeyDown}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {VERTICALS.map((v) => (
              <VerticalCard
                key={v.id}
                id={v.id}
                label={v.label}
                sublabel={v.sublabel}
                active={v.id === vertical}
                onSelect={() => selectVertical(v.id)}
              />
            ))}
          </div>
        </section>

        {/* ── 02 · SOURCE CONTENT ─────────────────────────────── */}
        <section className="mt-10">
          <div className="flex items-center justify-between gap-4">
            <h2 className="step-label">
              <span className="step-num">02</span>
              Paste English source content
            </h2>

            <button
              type="button"
              onClick={() => loadSample()}
              className="inline-flex min-h-[44px] shrink-0 items-center text-sm font-semibold text-st-blue hover:underline"
            >
              {sampleLoaded ? "Reload sample" : "Try a sample →"}
            </button>
          </div>

          {sourceText.length > 0 && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={clear}
                className="min-h-[44px] px-1 text-xs font-medium text-ink-muted transition-colors duration-200 hover:text-ink"
              >
                Clear
              </button>
            </div>
          )}

          <textarea
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value);
              if (sampleLoaded) setSampleLoaded(false);
            }}
            placeholder="Paste up to 300 words of English content you’re planning to publish in another language."
            className="mt-3 max-h-[400px] min-h-[140px] w-full resize-y rounded-xl border border-line bg-white p-5 text-[0.9375rem] leading-[1.6] text-pretty text-ink transition-shadow duration-300 outline-none placeholder:text-ink-muted/70 focus:border-st-blue focus:shadow-[0_0_0_3px_rgba(0,82,155,0.15)] sm:min-h-[180px]"
          />

          <p className="mt-3 text-pretty text-[13px] leading-[1.5] text-ink-muted">
            Up to 300 words – enough for most marketing copy, product
            descriptions, and technical content. Longer text? Request a full
            review.
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs" style={{ color: counterColor }}>
              {words} / {MAX_WORDS} words
            </p>
            <p className="text-xs text-ink-muted">
              Nothing is stored. This is an AI preview only.
            </p>
          </div>

          {overLimit && (
            <p className="mt-2 text-[13px] font-semibold text-st-orange">
              Please reduce to {MAX_WORDS} words or fewer to analyze.
            </p>
          )}
        </section>

        {/* ── 03 · LANGUAGE + ANALYZE ─────────────────────────── */}
        <section className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <h2 className="step-label">
              <span className="step-num">03</span>
              Target language
            </h2>

            <LanguageCombobox value={language} onChange={setLanguage} />
          </div>

          <div className="relative">
            <button
              type="button"
              disabled={!canAnalyze}
              onClick={() => analyze()}
              className="group inline-flex h-[52px] w-full min-w-[240px] items-center justify-center rounded-xl bg-st-blue px-7 text-[0.9375rem] font-semibold text-white transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              {loading ? (
                "Analyzing…"
              ) : (
                <>
                  Analyze translation
                  <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-enabled:group-hover:translate-x-1" />
                </>
              )}
            </button>

            {loading && (
              <span className="shimmer-bar absolute inset-x-0 -bottom-2 h-0.5 overflow-hidden rounded-full" />
            )}
          </div>
        </section>
      </motion.div>

      {/* Empty state — before anything has been analyzed. */}
      {!reviewing && !result && (
        <div className="mx-auto mt-6 flex max-w-5xl flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white/60 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-st-blue/[0.07] text-st-blue">
            <FileText className="h-6 w-6" />
          </span>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-muted">
            Paste content above to see how AI compares to a real linguist review.
          </p>
        </div>
      )}

      {/* The 20-second wait, staged as a review rather than a spinner. */}
      <AnimatePresence mode="wait">
        {reviewing ? (
          <ReviewProgress
            key="review"
            language={language}
            verticalLabel={activeVertical.label}
            status={status}
            error={error}
            onSettled={settle}
            onRetry={retry}
          />
        ) : result ? (
          <Results
            key="results"
            analysis={result}
            vertical={vertical}
            verticalLabel={activeVertical.label}
            language={language}
            sourceText={lastRun.current.sourceText}
            onReset={reset}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
});
