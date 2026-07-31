import type { Metadata } from "next";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { Hero } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import { SiteHeader } from "@/components/site-header";
import { StickyCta } from "@/components/sticky-cta";
import { TrustBar } from "@/components/trust-bar";
import { WhatAiCannotCatch } from "@/components/what-ai-cannot-catch";

export const metadata: Metadata = {
  title: "SimulTrans Checker — AI Translation Preview",
  description:
    "Preview what an AI thinks of any translation. See what a real SimulTrans linguist would catch. Request a full review from our certified team.",
};

/**
 * Landing page: positioning only. The tool, its results, and the linguist form
 * live on /analyze — the hero CTAs link there.
 */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <DisclaimerBanner />
      <main className="flex-1">
        <Hero />
        <TrustBar />
        <HowItWorks />

        <section className="bg-surface px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <WhatAiCannotCatch />
          </div>
        </section>
      </main>
      <StickyCta />
    </>
  );
}
