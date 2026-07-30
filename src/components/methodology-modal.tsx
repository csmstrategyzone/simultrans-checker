"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, UserCheck, ShieldCheck } from "lucide-react";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Explains the tool's methodology and, above all, reinforces that this is an
 * AI preview and not a certified linguist review.
 */
export function MethodologyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="methodology-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="relative z-10 my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
          >
            {/* Header band */}
            <div className="flex items-center justify-between bg-st-blue px-6 py-4">
              <h2
                id="methodology-title"
                className="font-heading text-xl font-bold text-white"
              >
                How the SimulTrans Checker works
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-6">
              <p className="text-[15px] leading-relaxed text-ink">
                This tool produces an{" "}
                <strong className="font-semibold text-st-blue">
                  AI-powered preview
                </strong>{" "}
                of how a translation might read. It is not a certified linguist
                review, and it does not replace the linguist.
              </p>

              <ol className="mt-6 space-y-5">
                <li className="flex gap-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-st-blue/10 text-st-blue">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">AI drafts a preview</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">
                      A large language model generates a translation and
                      flags issues it can detect, such as terminology, register,
                      and ambiguity.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-st-orange/15 text-st-orange">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">
                      AI cannot see the full picture
                    </p>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">
                      It has no access to your brand history, glossaries,
                      regulatory context, or the market knowledge a real linguist
                      brings.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-st-green/12 text-st-green">
                    <UserCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold text-ink">
                      A real SimulTrans linguist reviews it
                    </p>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">
                      Request a full review and a certified specialist checks the
                      work against everything AI cannot see, then delivers a
                      publish-ready result.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-6 rounded-xl border-l-4 border-st-green bg-surface p-4">
                <p className="text-[13px] leading-relaxed text-ink">
                  <strong className="font-semibold">Remember:</strong> AI
                  translates words. Real linguists translate meaning. Always
                  request a real SimulTrans linguist review before publishing.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
