"use client";

import { useRef } from "react";
import { AmbientGlow } from "@/components/ambient-glow";
import { Hero } from "@/components/hero";
import { SiteHeader } from "@/components/site-header";
import { ToolCard, type ToolCardHandle } from "@/components/tool-card";

export default function Home() {
  const tool = useRef<ToolCardHandle>(null);

  // Clear the sticky header: 80px on desktop, 60px on mobile.
  const scrollToTool = () => {
    const el = document.getElementById("tool");
    if (!el) return;
    const offset = window.innerWidth < 640 ? 60 : 80;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const runSampleReport = () => {
    scrollToTool();
    tool.current?.loadSampleAndAnalyze();
  };

  return (
    <>
      <SiteHeader />
      <main className="relative flex-1">
        <AmbientGlow />
        <Hero onRunCheck={scrollToTool} onSampleReport={runSampleReport} />

        <div className="px-6 pb-28">
          <ToolCard ref={tool} />
        </div>
      </main>
    </>
  );
}
