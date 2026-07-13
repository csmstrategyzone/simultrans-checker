"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const EASE = [0.16, 1, 0.3, 1] as const;

const LINE_ONE = ["AI", "translates", "words."];
const LINE_TWO = ["Linguists", "translate"];

const HEAD_START = 0.2;
const STAGGER = 0.08;
// "meaning" waits an extra 400ms after the last ordinary word has settled.
const MEANING_DELAY =
  HEAD_START + (LINE_ONE.length + LINE_TWO.length) * STAGGER + 0.4;

export function Hero({ onRunCheck, onSampleReport }: {
  onRunCheck: () => void;
  onSampleReport: () => void;
}) {
  const reduced = useReducedMotion();
  const scope = useRef<HTMLElement>(null);

  // Scroll-linked parallax. GSAP scrubs these far more smoothly than Framer.
  useGSAP(
    () => {
      if (reduced) return;

      // Headline drifts at 0.85x — trails the page slightly on the way out.
      gsap.to(".hero-headline", {
        yPercent: 15,
        ease: "none",
        scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom top", scrub: true },
      });

      // "meaning" takes a bow as it leaves: a touch bigger, then gone.
      gsap.to(".meaning-wrap", {
        scale: 1.03,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: scope.current, start: "center top", end: "bottom top", scrub: true },
      });
    },
    { scope, dependencies: [reduced] },
  );

  // Reduced motion: the whole headline fades as one block, no word-by-word.
  const word = (i: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4 } }
      : {
          initial: { opacity: 0, y: 30, filter: "blur(8px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 0.7, ease: EASE, delay: HEAD_START + i * STAGGER },
        };

  const fade = (delay: number, y = 16) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay: 0.1 } }
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: EASE, delay },
        };

  return (
    <section ref={scope} className="mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28">
      <div className="mx-auto max-w-5xl text-center">
        {/* Trust badge */}
        <motion.div
          {...fade(0, 12)}
          className="mb-9 inline-flex items-center gap-2.5 rounded-full border border-warm bg-white/70 px-4 py-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur"
        >
          <span className="relative flex h-1.5 w-1.5">
            {!reduced && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-60" />
            )}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sage" />
          </span>
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-ink-muted">
            40 years · Dublin · 100+ languages
          </span>
        </motion.div>

        {/* Headline */}
        {/* Wider than the prose column: line 2 must hold "Linguists translate meaning." on one line */}
        <h1 className="hero-headline hero-type mx-auto max-w-[64rem] text-[clamp(2.25rem,5.6vw,4.5rem)] text-ink">
          <span className="block">
            {LINE_ONE.map((w, i) => (
              <motion.span key={w} {...word(i)} className="inline-block">
                {w}
                {i < LINE_ONE.length - 1 && " "}
              </motion.span>
            ))}
          </span>

          {/* Looser leading on this line so the italic 'g' descender breathes */}
          <span className="block leading-[1.12]">
            {LINE_TWO.map((w, i) => (
              <motion.span
                key={w}
                {...word(LINE_ONE.length + i)}
                className="inline-block"
              >
                {w}
                {" "}
              </motion.span>
            ))}

            {/* THE signature moment — word and period never break apart */}
            <span className="meaning-wrap relative inline-block whitespace-nowrap">
              {/* Soft orange glow blooming behind the word */}
              <motion.span
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: reduced ? 0.25 : 0.4 }}
                transition={{
                  duration: 1,
                  ease: EASE,
                  delay: reduced ? 0.2 : MEANING_DELAY + 0.15,
                }}
                className="absolute inset-0 -z-10 blur-2xl"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(249,115,22,0.85) 0%, rgba(220,38,38,0.35) 55%, transparent 75%)",
                  transform: "scale(1.35)",
                }}
              />
              <motion.span
                className="meaning inline-block"
                style={{ backgroundSize: "220% 100%" }}
                initial={
                  reduced
                    ? { opacity: 0, backgroundPosition: "0% 0%" }
                    : {
                        opacity: 0,
                        y: 30,
                        filter: "blur(8px)",
                        backgroundPosition: "100% 0%",
                      }
                }
                animate={
                  reduced
                    ? { opacity: 1, backgroundPosition: "0% 0%" }
                    : {
                        opacity: 1,
                        y: 0,
                        filter: "blur(0px)",
                        backgroundPosition: "0% 0%",
                      }
                }
                transition={
                  reduced
                    ? { duration: 0.4, delay: 0.2 }
                    : {
                        duration: 0.7,
                        ease: EASE,
                        delay: MEANING_DELAY,
                        // the gradient sweep trails the word's arrival
                        backgroundPosition: {
                          duration: 1.1,
                          ease: EASE,
                          delay: MEANING_DELAY + 0.1,
                        },
                      }
                }
              >
                meaning
              </motion.span>
              {/* The period sits clear of the 'g' tail rather than tucked under it */}
              <motion.span
                {...word(LINE_ONE.length + LINE_TWO.length)}
                className="inline-block text-ink"
              >
                .
              </motion.span>
            </span>
          </span>
        </h1>

        {/* Subhead */}
        <motion.p
          {...fade(reduced ? 0 : 1.2)}
          className="mx-auto mt-8 max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-ink-muted sm:text-lg"
        >
          Machine translation is fluent, fast, and free. It is also confidently
          wrong in ways only a certified specialist can see. Paste your content
          below and watch the gap appear.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduced
              ? { duration: 0.4, delay: 0.2 }
              : { type: "spring", stiffness: 220, damping: 20, delay: 1.5 }
          }
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button
            onClick={onRunCheck}
            size="lg"
            className="group h-12 rounded-xl border border-sunset/60 bg-royal px-7 text-[0.9375rem] font-semibold text-white shadow-[0_6px_20px_-6px_rgba(30,58,138,0.5),inset_0_1px_0_rgba(255,255,255,0.12)] transition-[filter,box-shadow] duration-200 hover:brightness-110 active:scale-[0.98]"
          >
            Run a quality check
            <span className="ml-1.5 inline-block transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </Button>
          <Button
            onClick={onSampleReport}
            size="lg"
            variant="ghost"
            className="h-12 min-h-[44px] rounded-xl px-7 text-[0.9375rem] font-semibold text-ink-muted transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-white/60 hover:text-ink"
          >
            See a sample report
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
