import { HeartPulse, Scale, Megaphone, Code2 } from "lucide-react";

const SECTORS = [
  { icon: HeartPulse, label: "Medical" },
  { icon: Scale, label: "Legal" },
  { icon: Megaphone, label: "Marketing" },
  { icon: Code2, label: "Software" },
];

/** Below-the-fold trust bar with industry sector markers. */
export function TrustBar() {
  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 text-center">
        <p className="max-w-3xl text-[15px] leading-relaxed text-ink">
          Trusted by translation buyers in medical, legal, marketing and software
          sectors, for over 40 years.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SECTORS.map((s) => {
            const Icon = s.icon;
            return (
              <span
                key={s.label}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink-muted"
              >
                <Icon className="h-4 w-4 text-st-blue" />
                {s.label}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
