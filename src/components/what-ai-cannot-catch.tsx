import { TriangleAlert } from "lucide-react";
import { WHAT_AI_CANNOT_CATCH } from "@/lib/content";

/**
 * Sits between the AI preview and the lead form. Every item reinforces that a
 * real linguist sees what the AI structurally cannot.
 */
export function WhatAiCannotCatch() {
  return (
    <div className="mt-10 rounded-2xl border border-line border-l-4 border-l-st-green bg-white p-8">
      <h3
        className="font-heading text-[28px] leading-tight text-st-blue"
        style={{ fontWeight: 700 }}
      >
        What only a real SimulTrans linguist can catch
      </h3>

      <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {WHAT_AI_CANNOT_CATCH.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0 text-st-orange" />
            <span className="text-[14px] leading-relaxed text-ink">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
