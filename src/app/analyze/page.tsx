import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyzePanel } from "@/components/analyze-panel";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Analyze a translation — SimulTrans Checker",
  description:
    "Paste your translation and see what a SimulTrans linguist would catch, previewed by AI.",
};

export default function AnalyzePage() {
  return (
    <>
      <SiteHeader />
      <DisclaimerBanner />
      <main className="flex-1">
        {/* AnalyzePanel reads ?sample=true via useSearchParams, which needs a
            Suspense boundary or the whole route opts out of static rendering. */}
        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <AnalyzePanel />
        </Suspense>
      </main>
    </>
  );
}
