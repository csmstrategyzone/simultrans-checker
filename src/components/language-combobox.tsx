"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { LANGUAGE_GROUPS, LANGUAGES } from "@/lib/languages";

/**
 * A searchable target-language picker. Type to filter across 20 languages,
 * grouped by region. Built self-contained so it works without a combobox
 * primitive and stays on the SimulTrans palette.
 */
export function LanguageCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const selectedLabel =
    LANGUAGES.find((l) => l.value === value)?.label ?? "Select a language";

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANGUAGE_GROUPS;
    return LANGUAGE_GROUPS.map((g) => ({
      ...g,
      options: g.options.filter((o) => o.label.toLowerCase().includes(q)),
    })).filter((g) => g.options.length > 0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // Focus the search field as the panel opens.
    const id = setTimeout(() => input.current?.focus(), 20);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      clearTimeout(id);
    };
  }, [open]);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={root} className="relative mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-[52px] w-full items-center justify-between rounded-xl border bg-white px-4 text-left text-[0.9375rem] font-medium text-ink transition-colors duration-200 ${
          open ? "border-st-blue shadow-[0_0_0_3px_rgba(0,82,155,0.15)]" : "border-line hover:border-st-blue/50"
        }`}
      >
        <span>{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_48px_-16px_rgba(15,23,42,0.25)]">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" />
            <input
              ref={input}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search languages…"
              className="h-11 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-muted/70"
            />
          </div>

          <div className="max-h-[280px] overflow-y-auto p-1.5">
            {groups.length === 0 && (
              <p className="px-3 py-6 text-center text-[13px] text-ink-muted">
                No languages match &ldquo;{query}&rdquo;.
              </p>
            )}
            {groups.map((g) => (
              <div key={g.region} className="mb-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  {g.region}
                </p>
                {g.options.map((o) => {
                  const active = o.value === value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => select(o.value)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[14px] transition-colors ${
                        active
                          ? "bg-st-blue/10 font-semibold text-st-blue"
                          : "text-ink hover:bg-surface"
                      }`}
                    >
                      {o.label}
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
