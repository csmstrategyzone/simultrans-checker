"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { Download, Loader2 } from "lucide-react";
import type { Analysis, Issue } from "@/app/api/analyze/route";
import { LeadForm } from "@/components/lead-form";
import { WhatAiCannotCatch } from "@/components/what-ai-cannot-catch";
import { ScoreMethodology } from "@/components/score-methodology";
import { AiBadge } from "@/components/ai-badge";
import type { VerticalId } from "@/components/tool-card";
import { scoreBand } from "@/lib/content";
import { countWords } from "@/lib/words";

const EASE = [0.16, 1, 0.3, 1] as const;
const COUNT_EASE = [0.22, 1, 0.36, 1] as const;

const NEUTRAL = "#64748B";

// Severity — Red + Gold family (Margarita's warning/severity pairing).
const SEVERITY_COLOR: Record<Issue["severity"], { bg: string; fg: string }> = {
  Critical: { bg: "#DB5C3B", fg: "#FFFFFF" },
  High: { bg: "#F7941D", fg: "#0F172A" },
  Medium: { bg: "#FFC222", fg: "#0F172A" },
};

// Category — SimulTrans palette only.
const CATEGORY_COLOR: Record<Issue["category"], string> = {
  "Regulatory Risk": "#DB5C3B",
  Terminology: "#00529B",
  "Cultural Fit": "#F7941D",
  "Brand Voice": "#409A3C",
  Ambiguity: "#64748B",
};

/* ── Score: counts up, shifts from neutral grey into its band colour ── */
function Score({ score }: { score: number }) {
  const reduced = useReducedMotion();
  const band = scoreBand(score);
  const mv = useMotionValue(reduced ? score : 0);
  const [shown, setShown] = useState(reduced ? score : 0);

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
      <span
        style={{ color: shown === 0 ? NEUTRAL : band.color }}
        className="tabular font-mono text-[88px] font-normal leading-none tracking-[-0.02em] transition-colors duration-300 sm:text-[112px]"
      >
        {shown}
      </span>
      <span className="ml-1 font-mono text-[40px] leading-none text-ink-muted sm:text-[56px]">
        /100
      </span>
    </div>
  );
}

function FlagCard({ issue, index }: { issue: Issue; index: number }) {
  const reduced = useReducedMotion();
  const sev = SEVERITY_COLOR[issue.severity];

  return (
    <motion.article
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        ease: EASE,
        delay: reduced ? 0.05 : 0.4 + index * 0.1,
      }}
      style={{ borderLeftColor: sev.bg }}
      className="border-l-[3px] pl-5"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          style={{ background: sev.bg, color: sev.fg }}
          className="rounded px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em]"
        >
          {issue.severity}
        </span>
        <span
          style={{ color: CATEGORY_COLOR[issue.category] }}
          className="text-[11px] font-semibold uppercase tracking-[0.06em]"
        >
          {issue.category}
        </span>
        <AiBadge />
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
        <dd className="text-pretty text-[13px] leading-[1.5] text-ink">
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
  const band = scoreBand(analysis.score);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  const downloadPdf = async () => {
    setDownloading(true);
    setDownloadError(false);
    try {
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis,
          verticalLabel,
          language,
          sourceText,
          wordCount: countWords(sourceText),
        }),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SimulTrans-AI-Preview-Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="mx-auto mt-6 max-w-5xl"
    >
      {/* ── Header row: AI analysis label + PDF download ─────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <div className="flex items-center gap-2.5">
          <h2
            className="font-heading text-2xl text-ink"
            style={{ fontWeight: 700 }}
          >
            AI Analysis
          </h2>
          <AiBadge />
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={downloadPdf}
            disabled={downloading}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-st-blue px-5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Preparing…" : "Download PDF report"}
          </button>
          {downloadError && (
            <span className="text-xs text-st-red">
              Could not generate the PDF. Try again.
            </span>
          )}
        </div>
      </div>

      {/* ── Score + threshold band ─────────────────────────── */}
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="mt-6 grid grid-cols-1 gap-8 border-b border-line pb-12 md:grid-cols-[auto_1fr] md:gap-12"
      >
        <div>
          <p className="eyebrow text-ink-muted">AI quality preview score</p>
          <div className="mt-3">
            <Score score={analysis.score} />
          </div>
          <a
            href="#score-methodology"
            className="mt-3 inline-block text-[13px] font-medium text-st-blue underline-offset-2 hover:underline"
          >
            How is this calculated?
          </a>
        </div>

        <div className="flex items-center">
          {/* Threshold band — always recommends a real linguist review. */}
          <div
            className="w-full rounded-xl p-5"
            style={{ background: band.color, color: band.fg }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-80">
              What this score means
            </p>
            <p className="mt-2 text-[17px] font-semibold leading-snug">
              {band.label}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── How the score is produced ───────────────────────── */}
      <ScoreMethodology />

      {/* ── Split panel: machine output vs AI preview of a review ── */}
      <div className="mt-10 grid grid-cols-1 items-start overflow-hidden rounded-2xl border border-line bg-white lg:grid-cols-2">
        {/* Raw AI translation */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: reduced ? 0.05 : 0.3 }}
          className="border-b border-line p-6 lg:border-b-0 lg:border-r lg:p-8"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />
            <span className="eyebrow text-ink-muted">Machine Review</span>
            <AiBadge />
          </div>

          <p className="mt-1.5 text-[12px] text-ink-muted">
            Raw AI translation, unedited
          </p>

          <p className="mt-5 whitespace-pre-wrap font-mono text-[14px] leading-[1.7] text-pretty text-ink-muted">
            {analysis.translation}
          </p>

          <p className="mt-6 text-[11px] font-medium tracking-[0.01em] text-ink-muted/70">
            Unedited machine output · {language}
          </p>
        </motion.div>

        {/* AI preview of a linguist review */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: reduced ? 0.05 : 0.3 }}
          className="p-6 lg:p-8"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="h-1.5 w-1.5 rounded-full bg-st-blue" />
            <span className="eyebrow text-st-blue">
              AI Preview of a Linguist Review · {analysis.issues.length} flags
            </span>
          </div>

          <p className="mt-1.5 text-[12px] text-ink-muted">
            What a real SimulTrans linguist would look at, previewed by AI
          </p>

          <div className="mt-6 space-y-6">
            {analysis.issues.map((issue, i) => (
              <FlagCard key={i} issue={issue} index={i} />
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── What only a real linguist can catch ─────────────── */}
      <WhatAiCannotCatch />

      {/* ── Lead capture ────────────────────────────────────── */}
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
