"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Ripple = { id: number; x: number; y: number };

/** How long a ripple lives before it is pulled out of the DOM. */
const LIFESPAN_MS = 900;

/**
 * Touch-device counterpart to the desktop WebGL fluid cursor: a soft blue ink
 * ripple expanding from each tap.
 *
 * Self-guarding — it attaches no listener at all unless the device reports a
 * coarse pointer and the visitor has not asked for reduced motion, so mounting
 * it unconditionally in the layout is safe and desktop is untouched.
 */
export function TouchRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  // Tracked so pending cleanups can be cancelled if the component unmounts
  // mid-animation, rather than firing setState on a dead component.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Touch devices only; desktop keeps the WebGL sim.
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    // Reduced motion means no ripple at all, not a shorter one.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let nextId = 0;

    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const ripple: Ripple = { id: nextId++, x: touch.clientX, y: touch.clientY };
      setRipples((prev) => [...prev, ripple]);

      const timer = setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
        timers.current = timers.current.filter((t) => t !== timer);
      }, LIFESPAN_MS);
      timers.current.push(timer);
    };

    // Passive: this only paints, it never calls preventDefault, so scrolling
    // and taps on buttons behave exactly as they would without it.
    document.addEventListener("touchstart", handleTouch, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouch);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  return (
    // pointer-events-none so a ripple can never swallow a tap; z-1 keeps it
    // above the page but below any menu or modal.
    <div className="pointer-events-none fixed inset-0 z-[1]" aria-hidden="true">
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            initial={{ opacity: 0.35, scale: 0 }}
            animate={{ opacity: 0, scale: 8 }}
            transition={{ duration: LIFESPAN_MS / 1000, ease: "easeOut" }}
            className="absolute h-12 w-12 rounded-full"
            style={{
              left: ripple.x - 24,
              top: ripple.y - 24,
              // #00529B core fading through #68AEE0 — brand blues only.
              background:
                "radial-gradient(circle, rgba(0, 82, 155, 0.45) 0%, rgba(104, 174, 224, 0.2) 60%, transparent 100%)",
              mixBlendMode: "multiply",
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
