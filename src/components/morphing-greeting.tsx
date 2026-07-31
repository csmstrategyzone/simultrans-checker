"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Greeting = {
  /** The greeting itself, in its native script. */
  text: string;
  /** Language name, shown as a small caption under the greeting. */
  language: string;
};

/**
 * A short curated set rather than an exhaustive one: ten widely recognised
 * languages, each in its native script, spanning Latin, Devanagari, Japanese,
 * Han and Arabic so the rotation visibly crosses writing systems.
 *
 * All five scripts here resolve to fonts that ship on every mainstream OS, so
 * none of them depend on a downloaded web font to avoid tofu.
 */
const GREETINGS: Greeting[] = [
  { text: "Hello", language: "English" },
  { text: "Hola", language: "Spanish" },
  { text: "Bonjour", language: "French" },
  { text: "Ciao", language: "Italian" },
  { text: "Hallo", language: "German" },
  { text: "Dia dhuit", language: "Irish" },
  { text: "नमस्ते", language: "Hindi" },
  { text: "こんにちは", language: "Japanese" },
  { text: "你好", language: "Chinese" },
  { text: "مرحبا", language: "Arabic" },
];

const ROTATE_MS = 3000;
const FADE_SECONDS = 0.5;

/**
 * Myriad Pro carries the Latin glyphs; every non-Latin script falls through to
 * whatever the OS provides for it. The browser resolves this per character, so
 * a mixed string still renders — no single family needs to cover everything.
 */
const FONT_STACK = '"Myriad Pro", system-ui, serif';

const greetingClass = "block text-[16px] sm:text-[20px]";
const greetingStyle = {
  fontStyle: "italic" as const,
  color: "#00529B",
  lineHeight: 1,
  letterSpacing: "-0.01em",
};

const labelClass = "block text-[10px] sm:text-[11px]";
const labelStyle = {
  fontStyle: "normal" as const,
  color: "#64748B",
  lineHeight: 1,
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  marginTop: 3,
};

/** The greeting and its language caption, rendered as one crossfading unit. */
function Pair({ entry }: { entry: Greeting }) {
  return (
    <>
      <span className={greetingClass} style={greetingStyle}>
        {entry.text}
      </span>
      <span className={labelClass} style={labelStyle}>
        {entry.language}
      </span>
    </>
  );
}

/**
 * Rotating greeting used as an eyebrow above the hero headline.
 *
 * Decorative: it carries no information the page does not state elsewhere, and
 * content changing every three seconds is hostile to a screen reader, so the
 * whole thing is hidden from the accessibility tree.
 */
export function MorphingGreeting() {
  const reduced = useReducedMotion();

  // Null until mounted. Seeding this with Math.random() in the useState
  // initialiser would run on the server too and disagree with the client's
  // pick, which React flags as a hydration mismatch — so the random start
  // index is chosen in an effect, after hydration.
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    setIndex(Math.floor(Math.random() * GREETINGS.length));
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      // No-op until the random start index lands.
      setIndex((i) => (i === null ? null : (i + 1) % GREETINGS.length));
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [reduced]);

  const entry: Greeting | null = index === null ? null : GREETINGS[index];

  // Reduced motion: one entry, picked once, never animated or rotated.
  if (reduced) {
    return (
      <span aria-hidden style={{ fontFamily: FONT_STACK }}>
        {entry && <Pair entry={entry} />}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="inline-grid justify-items-center"
      style={{ fontFamily: FONT_STACK }}
    >
      {/* Holds both lines' worth of height so nothing below shifts before the
          first entry arrives, and so the row never collapses mid-crossfade. */}
      <span style={{ gridArea: "1 / 1", visibility: "hidden" }}>
        <span className={greetingClass} style={greetingStyle}>
          &nbsp;
        </span>
        <span className={labelClass} style={labelStyle}>
          &nbsp;
        </span>
      </span>

      <AnimatePresence mode="wait">
        {entry !== null && (
          <motion.span
            key={index}
            // Same grid cell as the spacer, so the outgoing and incoming pairs
            // occupy identical space — the crossfade cannot move the layout.
            style={{ gridArea: "1 / 1" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_SECONDS, ease: "easeInOut" }}
          >
            <Pair entry={entry} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
