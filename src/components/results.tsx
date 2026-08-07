"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { Download, Loader2, Lock } from "lucide-react";
import type { Analysis, Issue } from "@/app/api/analyze/route";
import { WhatAiCannotCatch } from "@/components/what-ai-cannot-catch";
import { ScoreMethodology } from "@/components/score-methodology";
import { AiBadge } from "@/components/ai-badge";
import { EmailGateModal } from "@/components/email-gate-modal";
import type { VerticalId } from "@/components/tool-card";
import { useEmailGate } from "@/hooks/use-email-gate";
import { flagsHeading, scoreBand, SEVERITY_COLOR } from "@/lib/content";
import { countWords } from "@/lib/words";

const EASE = [0.16, 1, 0.3, 1] as const;
const COUNT_EASE = [0.22, 1, 0.36, 1] as const;

const NEUTRAL = "#64748B";

// Severity colours live in lib/content so the PDF renders the same mapping.

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

/**
 * Severities whose detail sits behind the email gate. Everything else (today
 * only Medium) always renders in full, so a new lower severity added upstream
 * stays ungated by default.
 */
const GATED_SEVERITIES = new Set<Issue["severity"]>(["Critical", "High"]);

/** "critical" / "high-severity", for the locked-overlay sentence. */
const GATED_NOUN: Partial<Record<Issue["severity"], string>> = {
  Critical: "critical",
  High: "high-severity",
};

function FlagCard({ issue, index }: { issue: Issue; index: number }) {
  const reduced = useReducedMotion();
  const sev = SEVERITY_COLOR[issue.severity];
  const { isUnlocked, openGate } = useEmailGate();
  const locked = GATED_SEVERITIES.has(issue.severity) && !isUnlocked;

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

      {locked ? (
        /* Detail replaced outright rather than blurred — a blur still leaves
           the text in the accessibility tree and readable to a screen reader. */
        <div className="mt-2.5 rounded-xl border border-st-blue/25 bg-[#F8FAFC] p-4">
          <div className="flex gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-st-blue" />
            <div>
              <p className="text-pretty text-[14px] leading-[1.5] text-ink">
                Full details of this {GATED_NOUN[issue.severity]} issue are
                available with a certified SimulTrans linguist review.
              </p>
              <button
                type="button"
                onClick={() => openGate()}
                className="mt-2.5 inline-flex min-h-[36px] items-center text-[13px] font-semibold text-st-blue underline-offset-2 hover:underline"
              >
                Unlock full details
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
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
          </dl>
        </>
      )}
    </motion.article>
  );
}

export function Results({
  analysis,
  verticalLabel,
  language,
  sourceText,
}: {
  analysis: Analysis;
  verticalLabel: string;
  language: string;
  sourceText: string;
}) {
  const reduced = useReducedMotion();
  const band = scoreBand(analysis.score);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const { isUnlocked, openGate } = useEmailGate();

  const downloadPdf = async () => {
    setDownloading(true);
    setDownloadError(null);
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
      if (!res.ok) {
        // The route sends a specific reason for languages whose script the PDF
        // renderer cannot set; surface that rather than the generic message.
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "PDF generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "SimulTrans-AI-Preview-Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error && err.message
          ? err.message
          : "Could not generate the PDF. Try again.",
      );
    } finally {
      setDownloading(false);
    }
  };

  /**
   * The PDF always carries the full report, so the gate sits at the download
   * step: unlock first, then the same click's download runs on the callback.
   */
  const onDownloadClick = () => {
    if (isUnlocked) {
      void downloadPdf();
      return;
    }
    openGate(() => void downloadPdf());
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
            onClick={onDownloadClick}
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
            <span className="max-w-[22rem] text-right text-xs text-st-red">
              {downloadError}
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

      {/* ── Split panel: raw AI output vs the flags a linguist would raise ── */}
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
            <span className="eyebrow text-ink-muted">AI Translation</span>
            <AiBadge />
          </div>

          <p className="mt-1.5 text-[12px] text-ink-muted">
            Raw AI translation, unedited
          </p>

          <p className="mt-5 whitespace-pre-wrap font-mono text-[14px] leading-[1.7] text-pretty text-ink-muted">
            {analysis.translation}
          </p>

          <p className="mt-6 text-[11px] font-medium tracking-[0.01em] text-ink-muted/70">
            Unedited AI output · {language}
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
            <h3
              className="font-heading text-xl text-ink"
              style={{ fontWeight: 700 }}
            >
              {flagsHeading(analysis.issues.length)}
            </h3>
          </div>

          <div className="mt-6 space-y-6">
            {analysis.issues.length > 0 ? (
              analysis.issues.map((issue, i) => (
                <FlagCard key={i} issue={issue} index={i} />
              ))
            ) : (
              <p className="text-pretty text-[15px] leading-[1.6] text-ink-muted">
                The AI did not flag any issues in this translation. A certified
                linguist still checks brand voice, glossary consistency, and
                regulatory context that AI cannot see.
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── What only a real linguist can catch ─────────────── */}
      <WhatAiCannotCatch />

      {/* Lead capture now lives on the /analyze page itself, below this panel,
          so #linguist-form resolves even before anything has been analyzed. */}

      {/* One instance for the whole results view — the download button and every
          locked flag card open this same gate through useEmailGate(). */}
      <EmailGateModal />
    </motion.section>
  );
}
