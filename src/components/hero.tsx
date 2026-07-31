"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MorphingGreeting } from "@/components/morphing-greeting";

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Landing hero. Vertical rhythm is deliberately tight so the trust pill,
 * greeting, headline, subhead and both CTAs clear the fold at 900px viewport
 * height. Mobile keeps the looser spacing — it scrolls naturally there.
 */
export function Hero() {
  const reduced = useReducedMotion();

  const fade = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } }
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: EASE, delay },
        };

  return (
    <section className="mx-auto max-w-6xl px-6 pt-16 pb-10 sm:pt-12">
      <div className="mx-auto max-w-4xl text-center">
        {/* Trust badge */}
        <motion.div
          {...fade(0)}
          className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-1.5"
        >
          <span className="relative flex h-1.5 w-1.5">
            {!reduced && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-st-green opacity-60" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-st-green" />
          </span>
          <span className="text-[13px] font-medium tracking-[0.01em] text-ink-muted">
            Trusted since 1984 · 100+ languages
          </span>
        </motion.div>

        {/* Rotating greeting eyebrow */}
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <MorphingGreeting />
        </div>

        {/* Headline */}
        <motion.h1
          {...fade(0.1)}
          className="hero-type mx-auto max-w-[56rem] text-[clamp(2.5rem,5.2vw,4rem)] leading-[1.03] text-ink"
        >
          <span className="block">AI translates words.</span>
          <span className="block">Linguists translate</span>
          <span className="block text-st-blue">meaning.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          {...fade(0.25)}
          className="mx-auto mt-5 max-w-2xl text-pretty text-[1.0625rem] leading-relaxed text-ink-muted sm:text-lg"
        >
          Preview what an AI thinks of any translation. See what a real
          SimulTrans linguist would catch. Request a full review from our
          certified team.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fade(0.4)}
          className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            href="/analyze"
            className="group inline-flex h-12 items-center justify-center rounded-xl bg-st-blue px-7 text-[0.9375rem] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(0,82,155,0.5)] transition-[filter] duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            Run a quality check
            <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <Link
            href="/analyze?sample=true"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-white px-7 text-[0.9375rem] font-semibold text-ink-muted transition-all duration-200 hover:border-st-blue/40 hover:text-ink"
          >
            See a sample report
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
