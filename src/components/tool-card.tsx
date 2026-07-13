"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AnimatePresence, useReducedMotion } from "framer-motion";
import { ReviewProgress, type ReviewStatus } from "@/components/review-progress";
import { Results } from "@/components/results";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Analysis } from "@/app/api/analyze/route";
import { VerticalCard } from "@/components/vertical-card";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export type VerticalId = "medical" | "legal" | "marketing" | "software";

export const VERTICALS: {
  id: VerticalId;
  label: string;
  sublabel: string;
  sample: string;
}[] = [
  {
    id: "medical",
    label: "Medical & Pharma",
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
    label: "Marketing & Brand",
    sublabel: "Web · Campaigns · Sales copy",
    sample:
      "Break through the noise with content that connects. Our AI-powered platform helps growth teams move faster than ever — turning insight into action in seconds, not weeks.",
  },
  {
    id: "software",
    label: "Software & SaaS",
    sublabel: "UI · Docs · Product",
    sample:
      "Unable to complete this action. Please check your permissions and try again. If the problem persists, contact your workspace administrator or reach out to our support team for assistance.",
  },
];

const LANGUAGES = [
  { value: "German", label: "German (de-DE)" },
  { value: "Japanese", label: "Japanese (ja-JP)" },
  { value: "French", label: "French (fr-FR)" },
  { value: "Spanish", label: "Spanish (es-ES)" },
  { value: "Simplified Chinese", label: "Simplified Chinese (zh-CN)" },
  { value: "Brazilian Portuguese", label: "Brazilian Portuguese (pt-BR)" },
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

  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // The last payload analyzed, so Retry re-runs the same request.
  const lastRun = useRef({ vertical, language, sourceText });

  const analyze = async (
    v: VerticalId = vertical,
    l: string = language,
    s: string = sourceText,
  ) => {
    if (!s.trim()) return;
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
      console.log(data); // Phase 5 renders this
    } catch {
      setError("Couldn't reach the analysis service. Check your connection.");
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

  useGSAP(
    () => {
      if (reduced) return;

      gsap.from(scope.current, {
        opacity: 0,
        y: 40,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: { trigger: scope.current, start: "top 80%" },
      });

      gsap.from(".tool-step", {
        opacity: 0,
        y: 20,
        duration: 0.5,
        ease: "power2.out",
        stagger: 0.08,
        delay: 0.15,
        scrollTrigger: { trigger: scope.current, start: "top 80%" },
      });
    },
    { scope, dependencies: [reduced] },
  );

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

  const count = sourceText.length;
  const canAnalyze = sourceText.trim().length > 0 && !loading;

  const activeVertical = VERTICALS.find((v) => v.id === vertical)!;

  return (
    <>
    <div
      id="tool"
      ref={scope}
      className="mx-auto max-w-5xl scroll-mt-24 rounded-[20px] border border-warm bg-white/85 p-6 shadow-[0_10px_50px_-20px_rgba(15,23,42,0.15)] backdrop-blur-xl backdrop-saturate-150 sm:p-12"
    >
      {/* ── 01 CONTENT TYPE ─────────────────────────────────── */}
      <section className="tool-step">
        <h2 className="step-label">
          <span className="step-num">01</span>
          Choose your content type
        </h2>

        {/* Radiogroup: arrow keys move between options, Tab enters/leaves the set. */}
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
      <section className="tool-step mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="step-label">
            <span className="step-num">02</span>
            Paste English source content
          </h2>

          <button
            type="button"
            onClick={() => loadSample()}
            className="group relative inline-flex min-h-[44px] shrink-0 items-center text-sm font-medium text-sunset"
          >
            {sampleLoaded ? "Reload sample" : "Try a sample →"}
            <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-sunset transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
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
          placeholder="Paste product copy, regulatory text, marketing content, UI strings — anything you're planning to publish in another language."
          className="mt-3 max-h-[400px] min-h-[140px] w-full resize-y rounded-xl border border-warm bg-white p-5 text-[0.9375rem] leading-[1.6] text-pretty text-ink transition-shadow duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none placeholder:text-ink-muted/70 focus:border-royal focus:shadow-[0_0_0_3px_rgba(30,58,138,0.15)] sm:min-h-[180px]"
        />

        <p className="mt-3 font-mono text-xs text-ink-muted">
          {count > 0 && `${count} characters · `}
          Nothing is stored. This is a preview only.
        </p>
      </section>

      {/* ── 03 · LANGUAGE + ANALYZE ─────────────────────────── */}
      <section className="tool-step mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <h2 className="step-label">
            <span className="step-num">03</span>
            Target language
          </h2>

          <Select
            items={LANGUAGES}
            value={language}
            onValueChange={(v) => setLanguage(v as string)}
          >
            <SelectTrigger className="mt-4 h-[52px] w-full rounded-xl border-warm bg-white px-4 data-[size=default]:h-[52px] text-[0.9375rem] font-medium text-ink transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-royal data-[popup-open]:border-royal focus-visible:border-royal focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_rgba(30,58,138,0.15)]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent className="rounded-xl border border-warm bg-white p-1">
              {LANGUAGES.map((l, i) => (
                <SelectItem
                  key={l.value}
                  value={l.value}
                  style={{ "--i": i } as React.CSSProperties}
                  className="select-stagger rounded-lg px-3 py-2.5 text-[0.9375rem] text-ink data-highlighted:bg-accent"
                >
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative">
          <button
            type="button"
            disabled={!canAnalyze}
            onClick={() => analyze()}
            className="group h-[52px] w-full min-w-[240px] rounded-xl border-b-2 border-sunset bg-royal px-7 text-[0.9375rem] font-semibold text-white transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {loading ? (
              "Analyzing…"
            ) : (
              <>
                Analyze translation
                <span className="ml-1.5 inline-block transition-transform duration-200 group-enabled:group-hover:translate-x-1">
                  →
                </span>
              </>
            )}
          </button>

          {loading && (
            <span className="shimmer-bar absolute inset-x-0 -bottom-2 h-0.5 overflow-hidden rounded-full" />
          )}
        </div>
      </section>

    </div>

    {/* Before any results exist the document is too short for the browser to
        scroll the tool card up to its 80px anchor offset — the scroll clamps at
        the page bottom and the card lands ~180px down instead. This tail gives
        it the room; it disappears the moment real content takes its place. */}
    {!reviewing && !result && <div aria-hidden className="h-[19rem]" />}

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
