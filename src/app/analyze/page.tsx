import type { Metadata } from "next";
import { AnalyzePanel } from "@/components/analyze-panel";
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
      <main className="flex-1">
        {/* The Suspense boundary for ?sample=true lives inside AnalyzePanel,
            around a leaf that renders nothing — so the tool and lead form stay
            in the prerendered HTML instead of being swapped for a fallback. */}
        <AnalyzePanel />
      </main>
    </>
  );
}
