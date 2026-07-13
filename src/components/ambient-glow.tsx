"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Two warm blobs orbiting on different phases, plus a corner wash. The whole
 * layer drifts with the cursor (the light source follows your eye) and
 * parallaxes at 0.7x on scroll so it reads as distant.
 */
export function AmbientGlow({ intense = false }: { intense?: boolean }) {
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  // Lifts a touch while the cursor is working the hero, so the ambient blobs and
  // the fluid cursor layer read as one environment rather than two systems.
  const [stirred, setStirred] = useState(false);

  // Mouse parallax — capped at 20px so it's felt, not noticed.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(useTransform(mx, [-0.5, 0.5], [-20, 20]), {
    stiffness: 60,
    damping: 20,
  });
  const py = useSpring(useTransform(my, [-0.5, 0.5], [-20, 20]), {
    stiffness: 60,
    damping: 20,
  });

  useEffect(() => {
    if (reduced) return;
    let idle: ReturnType<typeof setTimeout>;
    const move = (e: MouseEvent) => {
      // Only while the hero is still on screen.
      if (window.scrollY > window.innerHeight) return;
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
      setStirred(true);
      clearTimeout(idle);
      idle = setTimeout(() => setStirred(false), 1200);
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => {
      window.removeEventListener("mousemove", move);
      clearTimeout(idle);
    };
  }, [reduced, mx, my]);

  useGSAP(
    () => {
      if (reduced) return;
      gsap.to(".ambient-layer", {
        yPercent: 30, // 0.7x — the background falls behind the page
        ease: "none",
        scrollTrigger: {
          trigger: scope.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope, dependencies: [reduced] },
  );

  const base = intense ? 0.12 : 0.08;

  return (
    <div
      ref={scope}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <motion.div
        className="ambient-layer absolute inset-0"
        style={{ x: px, y: py }}
        animate={{ filter: stirred && !reduced ? "brightness(1.06)" : "brightness(1)" }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="absolute -top-56 -right-40 h-[46rem] w-[46rem] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(249,115,22,0.10) 0%, rgba(234,88,12,0.04) 45%, transparent 70%)",
          }}
        />

        <motion.div
          className="absolute -top-32 right-[12%] h-[34rem] w-[34rem] rounded-full"
          style={{ background: "var(--sunset)", filter: "blur(100px)", opacity: base }}
          animate={
            reduced
              ? undefined
              : {
                  x: [0, 60, -20, 0],
                  y: [0, 40, 20, 0],
                  scale: [1, 1.08, 0.96, 1],
                  opacity: [base, base + 0.02, base, base],
                }
          }
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div
          className="absolute top-[14rem] -left-24 h-[28rem] w-[28rem] rounded-full"
          style={{
            background: "var(--ember)",
            filter: "blur(80px)",
            opacity: base - 0.02,
          }}
          animate={
            reduced
              ? undefined
              : {
                  x: [0, -40, 30, 0],
                  y: [0, 30, -25, 0],
                  scale: [1, 0.94, 1.06, 1],
                }
          }
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: -4, // phase offset so the two never sync
          }}
        />
      </motion.div>
    </div>
  );
}
