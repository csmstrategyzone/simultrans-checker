"use client";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Analysis, Issue } from "@/app/api/analyze/route";
import { LeadForm } from "@/components/lead-form";
import type { VerticalId } from "@/components/tool-card";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const EASE = [0.16, 1, 0.3, 1] as const;
const COUNT_EASE = [0.22, 1, 0.36, 1] as const;
const SPRING = { type: "spring", stiffness: 300, damping: 20 } as const;

const NEUTRAL = "#64748B";

function band(score: number) {
  if (score >= 85) return "#059669"; // sage
  if (score >= 65) return "#F97316"; // sunset
  return "#DC2626"; // ember
}

const SEVERITY_COLOR: Record<Issue["severity"], string> = {
  Critical: "#DC2626",
  High: "#F97316",
  Medium: "#475569",
};

const CATEGORY_COLOR: Record<Issue["category"], string> = {
  "Regulatory Risk": "#DC2626",
  Terminology: "#1E3A8A",
  "Cultural Fit": "#F97316",
  "Brand Voice": "#7C3AED",
  Ambiguity: "#475569",
};

/* ── Score: counts up, and shifts from neutral grey into its band colour ── */
function Score({ score }: { score: number }) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(reduced ? score : 0);
  const [shown, setShown] = useState(reduced ? score : 0);
  const target = band(score);

  // Guard: a score of 0 would make the input range [0, 0], which can't interpolate.
  const color = useTransform(mv, [0, Math.max(score, 1)], [NEUTRAL, target]);

  useEffect(() => {
    if (reduced) {
      setShown(score);
      mv.set(score);
      return;
    }
    const controls = animate(mv, score, {
      duration: 1.2,
      ease: COUNT_EASE,
      onUpdate: (v) => setShown(Math.round(v)),
    });
    return () => controls.stop();
  }, [score, reduced, mv]);

  return (
    <div className="flex items-baseline">
      <motion.span
        style={{ color: reduced ? target : color }}
        className="tabular font-mono text-[88px] font-normal leading-none tracking-[-0.02em] sm:text-[128px]"
      >
        {shown}
      </motion.span>
      <span className="ml-1 font-mono text-[44px] leading-none text-ink-muted sm:text-[64px]">
        /100
      </span>
    </div>
  );
}

/* ── The verdict: the one serif moment on the results ── */
function Verdict({ text, delay }: { text: string; delay: number }) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  if (reduced) {
    return (
      <motion.blockquote
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="voice text-pretty text-[26px] leading-[1.3] text-ink sm:text-[34px]"
      >
        &ldquo;{text}&rdquo;
      </motion.blockquote>
    );
  }

  return (
    <blockquote className="voice text-pretty text-[26px] leading-[1.3] text-ink sm:text-[34px]">
      <span aria-hidden>&ldquo;</span>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: delay + i * 0.06 }}
          className="inline-block"
        >
          {w}
          {i < words.length - 1 && " "}
        </motion.span>
      ))}
      <span aria-hidden>&rdquo;</span>
    </blockquote>
  );
}

function SeverityBadge({
  severity,
  lifted,
}: {
  severity: Issue["severity"];
  lifted: boolean;
}) {
  const reduced = useReducedMotion();
  const critical = severity === "Critical";
  const [entered, setEntered] = useState(false);

  return (
    <motion.span
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
      animate={
        reduced
          ? { opacity: 1 }
          : {
              opacity: 1,
              // Critical badges pulse once on arrival; after that, scale is the
              // hover affordance.
              scale: entered
                ? lifted
                  ? 1.05
                  : 1
                : critical
                  ? [1, 1.05, 1]
                  : 1,
            }
      }
      onAnimationComplete={() => setEntered(true)}
      transition={
        reduced
          ? { duration: 0.3 }
          : !entered && critical
            ? {
                opacity: SPRING,
                scale: { duration: 0.4, delay: 0.25, times: [0, 0.5, 1] },
              }
            : SPRING
      }
      style={{ background: SEVERITY_COLOR[severity] }}
      className="flag-badge rounded px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em] text-white"
    >
      {severity}
    </motion.span>
  );
}

/**
 * Hover is driven from React state, not CSS: Framer writes inline opacity and
 * transform on these cards, and Tailwind's border utility outranks our
 * component-layer rules, so a stylesheet hover would silently lose both fights.
 */
function FlagCard({
  issue,
  index,
  hovered,
  dimmed,
  onHover,
}: {
  issue: Issue;
  index: number;
  hovered: boolean;
  dimmed: boolean;
  onHover: (i: number | null) => void;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.article
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{
        opacity: dimmed ? 0.65 : 1,
        y: hovered && !reduced ? -2 : 0,
        borderLeftWidth: hovered && !reduced ? 4 : 3,
      }}
      transition={{
        duration: 0.5,
        ease: EASE,
        delay: reduced ? 0.1 : 0.8 + index * 0.12,
        opacity: { duration: 0.2, ease: EASE },
        y: { duration: 0.2, ease: EASE },
        borderLeftWidth: { duration: 0.2, ease: EASE },
      }}
      style={{
        borderLeftColor: SEVERITY_COLOR[issue.severity],
        borderLeftStyle: "solid",
      }}
      className="flag-card pl-5"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <SeverityBadge severity={issue.severity} lifted={hovered} />
        <span
          style={{ color: CATEGORY_COLOR[issue.category] }}
          className="text-[11px] font-semibold uppercase tracking-[0.06em]"
        >
          {issue.category}
        </span>
      </div>

      <p className="mt-2.5 text-pretty text-[15px] font-medium leading-[1.5] text-ink">
        {issue.problem}
      </p>

      <dl className="mt-3 grid grid-cols-[72px_1fr] gap-x-3 gap-y-2 sm:grid-cols-[100px_1fr]">
        <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
          Impact
        </dt>
        <dd className="text-pretty text-[13px] leading-[1.5] text-ink-muted">
          {issue.impact}
        </dd>

        <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
          Fix
        </dt>
        <dd className="text-pretty text-[13px] italic leading-[1.5] text-ink">
          {issue.fix}
        </dd>
      </dl>
    </motion.article>
  );
}

export function Results({
  analysis,
  vertical,
  verticalLabel,
  language,
  sourceText,
  onReset,
}: {
  analysis: Analysis;
  vertical: VerticalId;
  verticalLabel: string;
  language: string;
  sourceText: string;
  onReset: () => void;
}) {
  const reduced = useReducedMotion();
  const tone = band(analysis.score);
  const scope = useRef<HTMLElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  // The CTA travels slightly faster than the page — it arrives rather than waits.
  useGSAP(
    () => {
      if (reduced) return;
      gsap.to(".cta-parallax", {
        yPercent: -6,
        ease: "none",
        scrollTrigger: {
          trigger: ".cta-parallax",
          start: "top bottom",
          end: "bottom bottom",
          scrub: true,
        },
      });
    },
    { scope, dependencies: [reduced] },
  );

  return (
    <motion.section
      ref={scope}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="mx-auto mt-6 max-w-5xl"
    >
      {/* ── 1. Score + verdict ─────────────────────────────── */}
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="grid grid-cols-1 gap-10 border-b border-warm py-14 md:grid-cols-2 md:gap-12 md:py-16"
      >
        <div>
          <p className="eyebrow text-ink-muted">Linguist quality score</p>
          <div className="mt-4">
            <Score score={analysis.score} />
          </div>
          <span
            style={{ background: `${tone}1a`, color: tone }}
            className="mt-6 inline-block rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
          >
            {analysis.readiness}
          </span>
        </div>

        <div>
          <p className="eyebrow text-ink-muted">Linguist&rsquo;s assessment</p>
          <div className="mt-4">
            <Verdict text={analysis.verdict} delay={0.4} />
          </div>
        </div>
      </motion.div>

      {/* ── 2. Split panel: machine output vs expert review ──
          The left column is short and the right runs long. That imbalance IS the
          pitch, so the machine output pins while you scroll the human review. */}
      <div className="mt-10 grid grid-cols-1 items-start overflow-visible rounded-2xl border border-warm bg-paper lg:grid-cols-2">
        {/* Raw AI translation */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: reduced ? 0.1 : 0.6 }}
          className="border-b border-warm p-6 lg:sticky lg:top-24 lg:border-b-0 lg:border-r lg:p-8"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
              <span className="eyebrow text-ink-muted">
                Raw AI translation
              </span>
            </div>
            <span className="eyebrow hidden text-ink-muted/50 lg:inline">
              Reference
            </span>
          </div>

          <p className="mt-5 whitespace-pre-wrap font-mono text-[14px] leading-[1.7] text-pretty text-ink-muted">
            {analysis.translation}
          </p>

          <p className="mt-6 text-[11px] font-medium tracking-[0.02em] text-ink-muted/70">
            Unedited machine output · {language}
          </p>
        </motion.div>

        {/* Mobile-only divider that sells the contrast */}
        <div className="flex items-center justify-center gap-3 border-b border-warm bg-[#fffaf3] py-3 lg:hidden">
          <span className="eyebrow text-fire">See expert review ↓</span>
        </div>

        {/* Expert review */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: reduced ? 0.1 : 0.6 }}
          className="p-6 lg:p-8"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-1.5 w-1.5">
              {!reduced && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sunset opacity-70" />
              )}
              <span className="relative h-1.5 w-1.5 rounded-full bg-sunset" />
            </span>
            <span className="eyebrow text-fire">
              Expert review · {analysis.issues.length} flags
            </span>
          </div>

          <div className="flag-list mt-6 space-y-6">
            {analysis.issues.map((issue, i) => (
              <FlagCard
                key={i}
                issue={issue}
                index={i}
                hovered={hover === i}
                dimmed={hover !== null && hover !== i}
                onHover={setHover}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── 3. Lead capture ────────────────────────────────── */}
      <LeadForm
        vertical={vertical}
        verticalLabel={verticalLabel}
        language={language}
        sourceText={sourceText}
        score={analysis.score}
        readiness={analysis.readiness}
        onReset={onReset}
      />
    </motion.section>
  );
}
