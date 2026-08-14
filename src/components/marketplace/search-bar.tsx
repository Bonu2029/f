"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Mic, Search, Sparkles, X } from "lucide-react";
import { BRAND } from "@/lib/config";
import { SEARCH_EXAMPLES, parseQuery } from "@/lib/search";
import { CATEGORIES } from "@/lib/data/categories";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * Search entry point. The parser runs as you type so the box can show what it
 * understood ("Nails · Today · Under $60") before you commit — that preview is
 * what makes a natural-language box feel trustworthy rather than magic.
 */
export function SearchBar({
  defaultValue = "",
  size = "lg",
  autoFocus,
  className,
}: {
  defaultValue?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const parsed = value.trim() ? parseQuery(value) : null;

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function submit(query: string) {
    const q = query.trim();
    if (!q) return;
    setFocused(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  const suggestions = value.trim()
    ? CATEGORIES.filter((c) =>
        [c.name, c.plural_name, ...c.synonyms].some((s) =>
          s.toLowerCase().includes(value.trim().toLowerCase()),
        ),
      ).slice(0, 5)
    : [];

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
        role="search"
      >
        <label htmlFor="now-search" className="sr-only">
          Search for a service
        </label>
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border bg-surface transition-shadow duration-200",
            size === "lg" ? "h-[54px] pl-4 pr-2" : "h-12 pl-3.5 pr-2",
            focused
              ? "border-brand-400 shadow-[0_0_0_4px_rgba(108,77,255,0.12)]"
              : "border-line shadow-card",
          )}
        >
          <Search className="h-[19px] w-[19px] shrink-0 text-ink-muted" />
          <input
            id="now-search"
            value={value}
            autoFocus={autoFocus}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            placeholder={BRAND.searchPlaceholder}
            enterKeyHint="search"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue("")}
              aria-label="Clear search"
              className="tap-target flex items-center justify-center rounded-full text-ink-muted hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Voice search"
            onClick={() =>
              toast({
                title: "Voice search is coming soon",
                description: "Type what you need for now — plain phrases work.",
                tone: "info",
              })
            }
            className="tap-target flex items-center justify-center rounded-full text-ink-muted transition hover:bg-sunken hover:text-brand-600"
          >
            <Mic className="h-[18px] w-[18px]" />
          </button>
          <button
            type="submit"
            aria-label="Search"
            disabled={!value.trim()}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
              value.trim()
                ? "bg-brand-500 text-white hover:bg-brand-600"
                : "bg-sunken text-ink-muted",
            )}
          >
            <ArrowRight className="h-[18px] w-[18px]" />
          </button>
        </div>
      </form>

      {parsed && parsed.understood.length > 0 && !focused && (
        <div className="mt-2 flex flex-wrap gap-1.5 px-1">
          {parsed.understood.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-700"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-pop"
          >
            {suggestions.length > 0 && (
              <div className="mb-1">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => submit(c.name)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-sunken"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <CategoryIcon icon={c.icon} className="h-4 w-4" />
                    </span>
                    <span className="text-[14.5px] font-medium text-ink">{c.plural_name}</span>
                  </button>
                ))}
              </div>
            )}

            {parsed && parsed.understood.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1.5 px-3 py-2">
                <span className="text-[12px] font-semibold text-ink-muted">Understood:</span>
                {parsed.understood.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full bg-brand-50 px-2 py-0.5 text-[11.5px] font-semibold text-brand-700"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}

            {!value.trim() && (
              <>
                <p className="flex items-center gap-1.5 px-3 pb-1 pt-2 text-[12px] font-semibold text-ink-muted">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                  Try asking for
                </p>
                {SEARCH_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => submit(example)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition hover:bg-sunken"
                  >
                    <span className="text-[14px] text-ink">{example}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-ink-muted" />
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
