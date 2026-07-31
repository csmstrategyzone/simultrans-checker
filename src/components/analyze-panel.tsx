"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LeadForm } from "@/components/lead-form";
import {
  ToolCard,
  type AnalyzedContext,
  type ToolCardHandle,
} from "@/components/tool-card";

/**
 * The /analyze page body: the tool plus its results, and below them the
 * linguist-review form.
 *
 * The form lives here rather than inside <Results> so that #linguist-form
 * resolves on a cold load, before anything has been analyzed — the header CTA
 * links straight to it. Once a run completes, ToolCard hands the analysis up
 * through onAnalyzed and the form quotes it on submission.
 */
export function AnalyzePanel() {
  const tool = useRef<ToolCardHandle>(null);
  const [context, setContext] = useState<AnalyzedContext | null>(null);

  const searchParams = useSearchParams();
  const wantsSample = searchParams.get("sample") === "true";

  // Guard against the effect firing twice (React StrictMode in dev) and
  // kicking off two analyses.
  const sampleFired = useRef(false);
  useEffect(() => {
    if (!wantsSample || sampleFired.current) return;
    sampleFired.current = true;
    tool.current?.loadSampleAndAnalyze();
  }, [wantsSample]);

  return (
    <>
      <div className="bg-surface px-6 py-16">
        <ToolCard ref={tool} onAnalyzed={setContext} />
      </div>

      <section id="linguist-form" className="scroll-mt-24 px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <LeadForm
            // Before any analysis there is no vertical yet, so the copy falls
            // back to the neutral "a certified translation linguist".
            verticalLabel={context?.verticalLabel ?? "Translation"}
            analysis={
              context
                ? {
                    vertical: context.vertical,
                    language: context.language,
                    sourceText: context.sourceText,
                    score: context.score,
                    readiness: context.readiness,
                  }
                : undefined
            }
          />
        </div>
      </section>
    </>
  );
}
