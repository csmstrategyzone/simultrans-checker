"use client";

import { FileInput, Sparkles, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS: {
  n: string;
  icon: LucideIcon;
  title: string;
  body: string;
  tone: "blue" | "orange" | "green";
}[] = [
  {
    n: "1",
    icon: FileInput,
    title: "Paste your content",
    body: "Drop in up to 300 words of English you plan to publish in another language.",
    tone: "blue",
  },
  {
    n: "2",
    icon: Sparkles,
    title: "AI analyzes the translation",
    body: "Our AI drafts a translation and previews the issues it can detect.",
    tone: "orange",
  },
  {
    n: "3",
    icon: UserCheck,
    title: "Real linguist reviews it",
    body: "Request a full review and a certified SimulTrans linguist catches what AI cannot.",
    tone: "green",
  },
];

const TONE: Record<string, { bg: string; fg: string }> = {
  blue: { bg: "rgba(0, 82, 155, 0.10)", fg: "#00529B" },
  orange: { bg: "rgba(247, 148, 29, 0.14)", fg: "#F7941D" },
  green: { bg: "rgba(64, 154, 60, 0.12)", fg: "#409A3C" },
};

export function HowItWorks() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <h2 className="font-heading text-3xl font-700 text-ink sm:text-4xl" style={{ fontWeight: 700 }}>
          How the SimulTrans Checker works
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          A fast AI preview, followed by the real thing. The preview is where you
          start. The linguist is where you finish.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const tone = TONE[s.tone];
            return (
              <div
                key={s.n}
                className="rounded-2xl border border-line bg-white p-7"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: tone.bg, color: tone.fg }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className="font-mono text-sm font-medium"
                    style={{ color: tone.fg }}
                  >
                    Step {s.n}
                  </span>
                </div>
                <h3
                  className="mt-5 font-heading text-xl font-600 text-ink"
                  style={{ fontWeight: 600 }}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                  {s.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
