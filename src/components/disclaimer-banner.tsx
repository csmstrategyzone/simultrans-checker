"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { MethodologyModal } from "@/components/methodology-modal";

/**
 * Upfront, above-the-fold disclaimer. Margarita's core ask: every visitor must
 * understand immediately that this is an AI preview, not a linguist review.
 * Full-width light-blue band between the header and the hero.
 */
export function DisclaimerBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ background: "#68AEE0" }}>
        <div className="mx-auto flex max-w-6xl items-start gap-3 px-6 py-3 sm:items-center">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#00529B] sm:mt-0" />
          <p className="flex-1 text-[13px] leading-snug text-[#00529B] sm:text-[13.5px]">
            <span className="font-semibold">
              This is an AI-powered translation preview, not a certified linguist
              review.
            </span>{" "}
            It shows what a real SimulTrans linguist would catch. It does not
            replace the linguist.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-[#00529B] underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            Learn more
          </button>
        </div>
      </div>

      <MethodologyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
