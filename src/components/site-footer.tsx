/**
 * Persistent footer on every page. Light-blue tint background, dark gray text.
 */
export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-line"
      style={{ background: "rgba(104, 174, 224, 0.08)" }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] font-medium">
          © Copyright 2026 SimulTrans LLC. All rights reserved.
        </p>
        <p className="text-[12px] sm:text-right">
          Nothing you paste is stored or used to train AI.
        </p>
      </div>
    </footer>
  );
}
