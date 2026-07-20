"use client";

import Image from "next/image";
import { scrollToTool } from "@/lib/scroll";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand lockup — official SimulTrans logo mark, recolored to brand blue.
            TODO: If Margarita prefers the typed wordmark she requested, swap the
            Image below back for a text "SimulTrans" span. */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2.5">
            <Image
              src="/simultrans-logo.svg"
              alt="SimulTrans"
              width={48}
              height={36}
              priority
              className="h-9 w-auto"
              style={{ height: "36px", width: "auto" }}
            />
            <span className="text-lg leading-none text-ink-muted">|</span>
            <span
              className="font-heading text-2xl leading-none text-ink-muted"
              style={{ fontWeight: 500 }}
            >
              Checker
            </span>
          </div>
          <span className="mt-1 hidden text-[10px] leading-none tracking-[0.15em] text-ink-muted sm:block">
            your languages – your timeline
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
