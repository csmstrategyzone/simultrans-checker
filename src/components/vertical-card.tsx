"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion, useMotionValue, useSpring } from "framer-motion";

/**
 * A physical-feeling option: tilts up to 3° toward the cursor and carries a
 * soft highlight that tracks the pointer across its face.
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
  const reduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const [glow, setGlow] = useState({ x: 50, y: 50, on: false });

  const rx = useSpring(useMotionValue(0), { stiffness: 300, damping: 24 });
  const ry = useSpring(useMotionValue(0), { stiffness: 300, damping: 24 });

  const onMove = (e: React.MouseEvent) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    rx.set((0.5 - py) * 6); // max 3° either way
    ry.set((px - 0.5) * 6);
    setGlow({ x: px * 100, y: py * 100, on: true });
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
    setGlow((g) => ({ ...g, on: false }));
  };

  return (
    <motion.button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={active}
      tabIndex={active ? 0 : -1}
      data-vertical={id}
      onClick={onSelect}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={
        reduced
          ? undefined
          : { rotateX: rx, rotateY: ry, transformPerspective: 1000 }
      }
      className={`group relative min-h-[44px] overflow-hidden rounded-xl border px-5 py-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:hover:-translate-y-0.5 ${
        active
          ? "border-[1.5px] border-sunset bg-white/90 shadow-[inset_0_0_20px_rgba(249,115,22,0.08)] motion-safe:scale-[1.02]"
          : "border-warm bg-white/60 hover:border-sunset"
      }`}
    >
      {!reduced && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            opacity: glow.on ? 1 : 0,
            background: `radial-gradient(220px circle at ${glow.x}% ${glow.y}%, rgba(249,115,22,0.04), transparent 70%)`,
          }}
        />
      )}
      <div className="relative text-[0.9375rem] font-semibold text-ink">
        {label}
      </div>
      <div className="relative mt-0.5 text-xs tracking-[0.02em] text-ink-muted">
        {sublabel}
      </div>
    </motion.button>
  );
}
