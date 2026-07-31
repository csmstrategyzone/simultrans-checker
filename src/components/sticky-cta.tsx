"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

/**
 * Floating "Request a linguist review" button, bottom-right. Appears once the
 * visitor has scrolled past roughly the first viewport.
 *
 * This used to key off the tool card's `#tool` element, but the tool moved to
 * /analyze — on the landing page that element no longer exists, which left the
 * button permanently hidden. Scroll depth works on both routes.
 */
export function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShow(window.scrollY > window.innerHeight * 0.6);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Link
            href="/analyze#linguist-form"
            className="inline-flex items-center gap-2 rounded-full bg-st-blue px-5 py-3 text-[14px] font-semibold text-white shadow-[0_8px_24px_-6px_rgba(0,82,155,0.55)] transition-[filter] hover:brightness-110 active:scale-[0.98]"
          >
            <MessageSquare className="h-4 w-4" />
            Request a linguist review
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
