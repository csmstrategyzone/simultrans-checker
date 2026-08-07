"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, X } from "lucide-react";
import {
  EMAIL_KEY,
  OPEN_GATE_EVENT,
  UNLOCKED_EVENT,
  UNLOCKED_KEY,
  type OpenGateDetail,
} from "@/hooks/use-email-gate";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * The email gate. Mounted once per results view; opened by openGate() from
 * useEmailGate(), wherever that is called from.
 *
 * Follows the hand-rolled framer-motion overlay pattern this project already
 * uses for modals rather than pulling in a dialog dependency.
 */
export function EmailGateModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set by whoever opened the gate; runs only on a successful capture, and is
  // dropped if the visitor closes the modal instead.
  const onUnlocked = useRef<(() => void) | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      onUnlocked.current = (e as CustomEvent<OpenGateDetail>).detail?.onUnlocked;
      setError(null);
      setOpen(true);
    };
    window.addEventListener(OPEN_GATE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GATE_EVENT, onOpen);
  }, []);

  const close = () => {
    onUnlocked.current = undefined;
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Focus lands on the one thing the visitor has to do.
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.clearTimeout(t);
    };
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setError("Enter a valid email address");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not submit. Try again.");
      }

      try {
        window.sessionStorage.setItem(UNLOCKED_KEY, "true");
        // Kept for the HubSpot backfill once the token lands.
        window.sessionStorage.setItem(EMAIL_KEY, value);
      } catch {
        // Blocked storage: the unlock still applies for this render pass, it
        // just will not survive a refresh. Not worth failing the submission.
      }

      const after = onUnlocked.current;
      onUnlocked.current = undefined;
      setOpen(false);
      window.dispatchEvent(new Event(UNLOCKED_EVENT));
      after?.();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not submit. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

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
            onClick={close}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="email-gate-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: EASE }}
            className="relative z-10 my-8 w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-st-blue px-6 py-4">
              <h2
                id="email-gate-title"
                className="flex items-center gap-2.5 font-heading text-xl font-bold text-white"
              >
                <Lock className="h-5 w-5 shrink-0" />
                See the full analysis
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submit} className="px-6 py-6">
              <p className="text-pretty text-[15px] leading-relaxed text-ink-muted">
                Enter your email to unlock the full report and download PDF.
              </p>

              <label
                htmlFor="email-gate-input"
                className="mt-5 block text-[13px] font-semibold text-ink"
              >
                Email
              </label>
              <input
                id="email-gate-input"
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="you@company.com"
                autoComplete="email"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "email-gate-error" : undefined}
                className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 text-[0.9375rem] text-ink outline-none transition-shadow duration-200 placeholder:text-ink-muted/70 focus:border-st-blue focus:shadow-[0_0_0_3px_rgba(0,82,155,0.15)]"
              />

              {error && (
                <p
                  id="email-gate-error"
                  className="mt-2 text-[13px] font-medium text-st-red"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-st-blue px-6 text-[0.9375rem] font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Unlocking…" : "Unlock full report"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
