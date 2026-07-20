"use client";

/**
 * A clean, selectable content-type card. Enterprise-calm: SimulTrans blue on
 * the active state, no tilt or glow.
 */
export function VerticalCard({
  id,
  label,
  sublabel,
  active,
  onSelect,
}: {
  id: string;
  label: string;
  sublabel: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      tabIndex={active ? 0 : -1}
      data-vertical={id}
      onClick={onSelect}
      className={`min-h-[44px] rounded-xl border px-5 py-4 text-left transition-colors duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        active
          ? "border-[1.5px] border-st-blue bg-st-blue/[0.06]"
          : "border-line bg-white hover:border-st-blue/50"
      }`}
    >
      <div className="text-[0.9375rem] font-semibold text-ink">{label}</div>
      <div className="mt-0.5 text-xs tracking-[0.01em] text-ink-muted">
        {sublabel}
      </div>
    </button>
  );
}
