"use client";

import { useRef } from "react";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { SiteHeader } from "@/components/site-header";
import { StickyCta } from "@/components/sticky-cta";
import { ToolCard, type ToolCardHandle } from "@/components/tool-card";
import { TrustBar } from "@/components/trust-bar";
import { scrollToTool } from "@/lib/scroll";

export default function Home() {
  const tool = useRef<ToolCardHandle>(null);

  const runSampleReport = () => {
    scrollToTool();
    tool.current?.loadSampleAndAnalyze();
  };

  return (
    <>
      <SiteHeader />
      <DisclaimerBanner />
      <main className="flex-1">
        <Hero onRunCheck={scrollToTool} onSampleReport={runSampleReport} />
        <HowItWorks />
        <TrustBar />

        <div className="bg-surface px-6 py-20">
          <ToolCard ref={tool} />
        </div>
      </main>
      <StickyCta />
    </>
  );
}
