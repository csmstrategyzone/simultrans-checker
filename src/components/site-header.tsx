"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  // Same offset the hero CTA uses, so both land the tool card identically.
  const scrollToTool = () => {
    const el = document.getElementById("tool");
    if (!el) return;
    const offset = window.innerWidth < 640 ? 60 : 80;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - offset,
      behavior: "smooth",
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-warm bg-[rgba(254,249,240,0.72)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center">
          <Image
            src="/simultrans-logo.svg"
            alt="SimulTrans"
            width={40}
            height={32}
            priority
            className="mr-3 h-8 w-auto"
          />
          <span className="text-[1.0625rem] font-bold tracking-[-0.02em] text-royal">
            SimulTrans
          </span>
          <span className="ml-1.5 text-[1.0625rem] font-normal tracking-[-0.02em] text-ink-muted">
            Checker
          </span>
        </div>

        <div className="flex items-center gap-5">
          <span className="hidden text-[0.8125rem] font-medium tracking-[0.02em] text-fire sm:inline">
            ISO 17100 Certified
          </span>
            <Button
              size="sm"
              onClick={scrollToTool}
              className="min-h-[44px] rounded-lg border-b-2 border-sunset bg-royal px-4 font-semibold text-white shadow-[0_4px_12px_-4px_rgba(30,58,138,0.5)] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:brightness-110 active:scale-[0.98]"
            >
              <span className="hidden sm:inline">Talk to a linguist</span>
              <span className="sm:hidden">Talk</span>
            </Button>
        </div>
      </div>
    </header>
  );
}
