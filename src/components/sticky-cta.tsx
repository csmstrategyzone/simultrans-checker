"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import { scrollToTool } from "@/lib/scroll";

/**
 * Floating "Request a linguist review" button, bottom-right. Appears only after
 * the visitor scrolls past the tool card.
 */
export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const tool = document.getElementById("tool");
      if (!tool) return;
      const past = tool.getBoundingClientRect().bottom < 0;
      setShow(past);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          onClick={scrollToTool}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-st-blue px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(0,82,155,0.55)] transition-[filter] hover:brightness-110 active:scale-[0.98]"
        >
          <MessageSquare className="h-4 w-4" />
          Request a linguist review
        </motion.button>
      )}
    </AnimatePresence>
  );
}
