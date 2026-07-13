"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/** 2px sunset→ember bar riding the header's bottom border. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden
      data-scroll-progress
      style={{ scaleX }}
      className="fixed left-0 top-16 z-50 h-0.5 w-full origin-left"
    >
      <span
        className="block h-full w-full"
        style={{
          background: "linear-gradient(90deg, var(--sunset), var(--ember))",
        }}
      />
    </motion.div>
  );
}
