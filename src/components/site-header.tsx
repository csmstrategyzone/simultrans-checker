"use client";

import Image from "next/image";
import { scrollToTool } from "@/lib/scroll";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        {/* Official SimulTrans lockup (mark + wordmark + rule + slogan) followed
            by the Checker sub-brand. Margarita's rule: no changes to the logo,
            so the lockup is rendered as-is and the slogan is no longer typed
            separately — the artwork already contains it. Intrinsic width/height
            match the SVG viewBox (396×108); display size is driven by `style`. */}
        <div className="flex items-center gap-3">
          <Image
            src="/SimulTransLogo.svg"
            alt="SimulTrans - your languages – your timeline"
            width={396}
            height={108}
            priority
            style={{ height: "48px", width: "auto" }}
          />
          <span className="text-xl leading-none text-ink-muted">|</span>
          <span
            className="font-heading text-2xl leading-none text-ink-muted"
            style={{ fontWeight: 500 }}
          >
            Checker
          </span>
        </div>

        <button
          type="button"
          onClick={scrollToTool}
          className="min-h-[40px] rounded-lg bg-st-blue px-4 text-[14px] font-semibold text-white shadow-[0_4px_12px_-4px_rgba(0,82,155,0.5)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-110 active:scale-[0.98]"
        >
          <span className="hidden sm:inline">Request a linguist review</span>
          <span className="sm:hidden">Request review</span>
        </button>
      </div>
    </header>
  );
}
