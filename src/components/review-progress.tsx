"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

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
    `Producing baseline machine translation into ${language}`,
    "Consulting the ISO 17100 quality rubric",
    "Checking regulatory register and terminology",
    "Reviewing cultural fit and brand voice consistency",
    "Compiling linguist recommendations",
  ];
  const last = steps.length - 1;

  // Which step is currently being worked. Advances on a timer, but parks on the
  // final step if the API is slower than the choreography — we never tick
  // through all six and then sit there claiming to be finished.
  const [active, setActive] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const settled = useRef(false);
  const panel = useRef<HTMLDivElement>(null);

  // The panel opens below the fold — bring it into view or the user watches a
  // disabled button for 20 seconds while the review happens off-screen.
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

  // Well past the usual 20-30s. Say something rather than let it look hung.
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
    // Let the final checkmark land before handing over to the results.
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
      className="relative mx-auto mt-6 max-w-5xl overflow-hidden rounded-[20px] border border-warm bg-white/85 p-6 shadow-[0_10px_50px_-20px_rgba(15,23,42,0.15)] backdrop-blur-xl backdrop-saturate-150 sm:p-10"
    >
      {/* A few motes drifting up behind the list — the room is alive. */}
      {!reduced && (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]">
          {[
            { left: "18%", delay: "0s" },
            { left: "47%", delay: "2.5s" },
            { left: "71%", delay: "5s" },
            { left: "88%", delay: "7.5s" },
          ].map((m) => (
            <span
              key={m.left}
              className="mote absolute bottom-8 h-1 w-1 rounded-full bg-sunset"
              style={{ left: m.left, animationDelay: m.delay }}
            />
          ))}
        </div>
      )}

      <h2 className="step-label mb-6">
        <span className="step-num">—</span>
        Review in progress
      </h2>

      <ol className="space-y-4">
        {steps.map((label, i) => {
          const complete = allDone || i < active;
          const isActive = !allDone && i === active;
          const failed = status === "error" && i === active;

          return (
            <li key={label} className="flex items-center gap-3.5">
              <span
                className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-300 ${
                  failed
                    ? "border-flag bg-flag"
                    : complete
                      ? "border-sage bg-sage"
                      : isActive
                        ? "border-sunset bg-sunset"
                        : "border-warm bg-white"
                }`}
              >
                {complete && !failed && (
                  <Check
                    className={`h-2.5 w-2.5 text-white ${reduced ? "" : "check-nod"}`}
                    strokeWidth={3.5}
                  />
                )}
                {isActive && !failed && !reduced && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sunset opacity-60" />
                )}
              </span>

              <span
                className={`text-pretty text-[0.9375rem] font-medium transition-colors duration-300 ${
                  failed
                    ? "text-flag"
                    : complete || isActive
                      ? "text-ink"
                      : "text-ink-muted/60"
                }`}
              >
                <span className={isActive && !failed && !reduced ? "step-shimmer" : undefined}>
                  {label}
                </span>
                {slow && isActive && (
                  <span className="mt-1 block text-xs font-normal tracking-[0.02em] text-ink-muted">
                    Working on a complex analysis. This can take a moment.
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      {status === "error" ? (
        <div className="mt-7 flex flex-col items-start gap-3 border-t border-warm pt-5 sm:flex-row sm:items-center sm:justify-between">
          {/* The message already carries its own prompt — don't bolt another on. */}
          <p className="text-pretty text-sm text-flag">
            {error ?? "Review paused. Try again?"}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="group h-11 min-h-[44px] shrink-0 rounded-lg border-b-2 border-sunset bg-royal px-5 text-sm font-semibold text-white transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-110 active:scale-[0.98]"
          >
            Retry review
            <span className="ml-1.5 inline-block transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </button>
        </div>
      ) : (
        <p className="mt-7 border-t border-warm pt-5 text-xs font-medium tracking-[0.02em] text-ink-muted">
          Reviewing as a certified {verticalLabel} linguist would · avg 20–30
          seconds
        </p>
      )}
    </motion.div>
  );
}

export { AnimatePresence };
