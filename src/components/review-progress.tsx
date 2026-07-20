"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ArrowRight, TriangleAlert } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;
const STEP_MS = 3500;

export type ReviewStatus = "running" | "done" | "error";

export function ReviewProgress({
  language,
  verticalLabel,
  status,
  error,
  onSettled,
  onRetry,
}: {
  language: string;
  verticalLabel: string;
  status: ReviewStatus;
  error: string | null;
  /** Fired once the final step has ticked and the checkmark has landed. */
  onSettled: () => void;
  onRetry: () => void;
}) {
  const reduced = useReducedMotion();

  const steps = [
    "Parsing source content and identifying subject vertical",
    `Producing a baseline machine translation into ${language}`,
    "Comparing against a professional quality rubric",
    "Flagging regulatory register and terminology risks",
    "Checking cultural fit and brand voice signals",
    "Compiling the AI preview of a linguist review",
  ];
  const last = steps.length - 1;

  const [active, setActive] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const settled = useRef(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "center",
    });
    // Mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      setActive((s) => (s < last ? s + 1 : s));
    }, STEP_MS);
    return () => clearInterval(id);
  }, [status, last]);

  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (status !== "running") return;
    const id = setTimeout(() => setSlow(true), 45_000);
    return () => clearTimeout(id);
  }, [status]);

  useEffect(() => {
    if (status !== "done" || settled.current) return;
    settled.current = true;
    setActive(last);
    setAllDone(true);
    const id = setTimeout(onSettled, reduced ? 0 : 300);
    return () => clearTimeout(id);
  }, [status, last, onSettled, reduced]);

  return (
    <motion.div
      ref={panel}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.4, ease: EASE } }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative mx-auto mt-6 max-w-5xl overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.25)] sm:p-10"
    >
      <h2 className="step-label mb-6">
        <span className="step-num">AI</span>
        AI preview in progress
      </h2>

      <ol className="space-y-4">
        {steps.map((label, i) => {
          const complete = allDone || i < active;
          const isActive = !allDone && i === active;
          const failed = status === "error" && i === active;

          return (
            <li key={label} className="flex items-center gap-3.5">
              <span
                className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                  failed
                    ? "border-st-red bg-st-red"
                    : complete
                      ? "border-st-blue bg-st-blue"
                      : isActive
                        ? "border-st-blue bg-white"
                        : "border-line bg-white"
                }`}
              >
                {complete && !failed && (
                  <Check
                    className={`h-3 w-3 text-white ${reduced ? "" : "check-nod"}`}
                    strokeWidth={3.5}
                  />
                )}
                {failed && <TriangleAlert className="h-3 w-3 text-white" />}
                {isActive && !failed && !reduced && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-st-blue opacity-40" />
                )}
                {isActive && !failed && (
                  <span className="relative h-2 w-2 rounded-full bg-st-blue" />
                )}
              </span>

              <span
                className={`text-pretty text-[0.9375rem] font-medium transition-colors duration-300 ${
                  failed
                    ? "text-st-red"
                    : complete || isActive
                      ? "text-ink"
                      : "text-ink-muted/60"
                }`}
              >
                {label}
                {slow && isActive && (
                  <span className="mt-1 block text-xs font-normal tracking-[0.01em] text-ink-muted">
                    Working on a complex analysis. This can take a moment.
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {status === "error" ? (
        <div className="mt-7 flex flex-col items-start gap-3 rounded-xl border-l-4 border-st-red bg-st-red/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-st-red" />
            <p className="text-pretty text-sm font-medium text-ink">
              {error ?? "Preview paused. Try again?"}
            </p>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="group inline-flex h-11 min-h-[44px] shrink-0 items-center rounded-lg bg-st-blue px-5 text-sm font-semibold text-white transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-110 active:scale-[0.98]"
          >
            Retry
            <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>
        </div>
      ) : (
        <p className="mt-7 border-t border-line pt-5 text-xs font-medium tracking-[0.01em] text-ink-muted">
          An AI preview of what a certified {verticalLabel} linguist would catch ·
          avg 20 to 30 seconds
        </p>
      )}
    </motion.div>
  );
}

export { AnimatePresence };
