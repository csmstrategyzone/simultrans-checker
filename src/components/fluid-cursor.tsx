"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

const PRIMARY = 600; // light-blue ink layer
const SECONDARY = 400; // pale highlight, chases with more lag

/**
 * A pool of blue ink sitting in the page background. The cursor disturbs it;
 * it chases with heavy smoothing, breathes when left alone, swells toward
 * intent, and ripples on click.
 *
 * Two layers with different spring constants is what sells the depth — they
 * never quite catch up to each other.
 *
 * Restored from v1 (removed in the v2 rebuild) on the minimal path: pure DOM
 * plus Framer Motion springs, no WebGL, and repainted in the SimulTrans blues.
 * Disables itself on touch devices and under prefers-reduced-motion.
 */
export function FluidCursor() {
  const reduced = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [hot, setHot] = useState(false); // cursor is over something interactive
  const [ripple, setRipple] = useState(0);

  // Raw pointer position (page-independent — the layer is fixed).
  const mx = useMotionValue(-9999);
  const my = useMotionValue(-9999);

  // Low stiffness is the whole feel: the light lags behind the hand.
  const x1 = useSpring(mx, { stiffness: 60, damping: 20, mass: 1 });
  const y1 = useSpring(my, { stiffness: 60, damping: 20, mass: 1 });
  const x2 = useSpring(mx, { stiffness: 40, damping: 20, mass: 1.2 });
  const y2 = useSpring(my, { stiffness: 40, damping: 20, mass: 1.2 });

  useEffect(() => {
    if (reduced) return;
    const mq = window.matchMedia("(pointer: fine)");
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [reduced]);

  useEffect(() => {
    if (!enabled) return;

    let idleTimer: ReturnType<typeof setTimeout>;
    let raf = 0;
    let drifting = false;
    let last = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const start = performance.now();

    // Left alone, the light keeps moving — a slow orbit around where it was.
    const drift = () => {
      const t = (performance.now() - start) / 1000;
      mx.set(last.x + Math.sin(t * (Math.PI / 2)) * 8);
      my.set(last.y + Math.cos(t * (Math.PI / 2.4)) * 8);
      raf = requestAnimationFrame(drift);
    };

    const stopDrift = () => {
      drifting = false;
      cancelAnimationFrame(raf);
    };

    const move = (e: MouseEvent) => {
      stopDrift();
      last = { x: e.clientX, y: e.clientY };
      mx.set(e.clientX);
      my.set(e.clientY);

      const el = document.elementFromPoint(e.clientX, e.clientY);
      setHot(
        !!el?.closest(
          'button, a, textarea, select, input, [role="radio"], [data-slot="select-trigger"]',
        ),
      );

      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (drifting) return;
        drifting = true;
        raf = requestAnimationFrame(drift);
      }, 2000);
    };

    // A drop in water.
    const click = () => setRipple((n) => n + 1);

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mousedown", click, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", click);
      clearTimeout(idleTimer);
      cancelAnimationFrame(raf);
    };
  }, [enabled, mx, my]);

  if (!enabled) return null;

  const swell = hot ? 1.2 : 1;

  return (
    <div
      aria-hidden
      data-fluid-cursor
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
    >
      {/* Primary: light SimulTrans blue #68AEE0 */}
      <motion.div
        data-fluid-layer="primary"
        style={{
          x: x1,
          y: y1,
          width: PRIMARY,
          height: PRIMARY,
          marginLeft: -PRIMARY / 2,
          marginTop: -PRIMARY / 2,
          filter: "blur(80px)",
          mixBlendMode: "multiply",
          willChange: "transform",
          background:
            "radial-gradient(circle, rgba(104,174,224,0.35) 0%, rgba(104,174,224,0.15) 25%, transparent 60%)",
        }}
        className="absolute left-0 top-0 rounded-full"
        animate={{ scale: swell, opacity: hot ? 1 : 0.85 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* The ripple rides the primary layer so it starts at the cursor. */}
        <motion.span
          key={ripple}
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,82,155,0.22) 0%, transparent 60%)",
          }}
          initial={ripple === 0 ? false : { scale: 1, opacity: 0.9 }}
          animate={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </motion.div>

      {/* Secondary: pale blue highlight, laggier — the two never quite align */}
      <motion.div
        data-fluid-layer="secondary"
        style={{
          x: x2,
          y: y2,
          width: SECONDARY,
          height: SECONDARY,
          marginLeft: -SECONDARY / 2,
          marginTop: -SECONDARY / 2,
          filter: "blur(60px)",
          mixBlendMode: "overlay",
          willChange: "transform",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(104,174,224,0.18) 30%, transparent 65%)",
        }}
        className="absolute left-0 top-0 rounded-full"
        animate={{ scale: hot ? 1.15 : 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}
