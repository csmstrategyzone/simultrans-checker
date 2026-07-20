import { Sparkles } from "lucide-react";

/** Marks every AI-produced insight so it is never mistaken for a real review. */
export function AiBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-st-blue/25 bg-st-blue/[0.06] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em] text-st-blue ${className}`}
    >
      <Sparkles className="h-2.5 w-2.5" />
      AI Generated
    </span>
  );
}
