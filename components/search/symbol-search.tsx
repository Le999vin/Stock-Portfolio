"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useSymbolSearch } from "@/lib/queries";
import type { SymbolSearchResult } from "@/types";
import { cn } from "@/lib/utils";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SymbolSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  const { data: results = [], isFetching } = useSymbolSearch(debouncedQuery);

  const handleSelect = useCallback(
    (result: SymbolSearchResult) => {
      router.push(`/asset/${encodeURIComponent(result.symbol)}`);
      setQuery("");
      setOpen(false);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[highlighted]) handleSelect(results[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setHighlighted(0);
    setOpen(debouncedQuery.length > 0 && results.length > 0);
  }, [results, debouncedQuery]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search symbols…"
          className="pl-8 h-8 text-sm bg-muted/30 border-border/50 focus:bg-background"
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute top-full mt-1 w-full z-50 rounded-md border border-border bg-popover shadow-lg overflow-hidden"
          >
            {isFetching && results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
            ) : (
              <ul>
                {results.slice(0, 8).map((r, i) => (
                  <li key={r.symbol}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelect(r)}
                      onMouseEnter={() => setHighlighted(i)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors",
                        highlighted === i
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-medium shrink-0">{r.symbol}</span>
                        <span className="text-muted-foreground truncate text-xs">
                          {r.instrument_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-xs text-muted-foreground">{r.exchange}</span>
                        <span className="text-[10px] uppercase tracking-wide px-1 py-0.5 rounded bg-muted text-muted-foreground">
                          {r.instrument_type}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
