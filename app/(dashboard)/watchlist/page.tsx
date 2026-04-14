"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  useWatchlist,
  useMarketOverview,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useUpdateWatchlistItem,
  useSymbolSearch,
} from "@/lib/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceChangeBadge } from "@/components/common/price-change-badge";
import {
  Search,
  Plus,
  Trash2,
  Pin,
  PinOff,
  Loader2,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import type { WatchlistItem, AssetSummary, SymbolSearchResult } from "@/types";
import { cn } from "@/lib/utils";

// ---------- helpers ----------

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  }).format(price);
}

function formatVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000)     return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)         return `${(v / 1_000).toFixed(0)}K`;
  return v.toString();
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

const PRIORITY_COLORS = {
  high:   "border-emerald-400/40 text-emerald-400 bg-emerald-400/10",
  medium: "border-yellow-400/40 text-yellow-400 bg-yellow-400/10",
  low:    "border-muted-foreground/30 text-muted-foreground bg-muted/30",
} as const;

// ---------- Add Symbol Drawer ----------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function AddSymbolPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQ = useDebounce(query, 300);
  const { data: results = [], isFetching } = useSymbolSearch(debouncedQ);
  const add = useAddToWatchlist();
  const { data: watchlist = [] } = useWatchlist();
  const router = useRouter();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleAdd = useCallback(
    (r: SymbolSearchResult) => {
      add.mutate(r.symbol, { onSuccess: onClose });
    },
    [add, onClose]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0,  scale: 1    }}
      exit={{    opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg border border-border/50 bg-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Add Symbol</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <span className="text-lg leading-none">×</span>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or company…"
          className="pl-8"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Priority:</span>
        {(["high", "medium", "low"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPriority(p)}
            className={cn(
              "text-xs px-2 py-0.5 rounded border capitalize transition-colors duration-100",
              priority === p ? PRIORITY_COLORS[p] : "border-border/30 text-muted-foreground hover:border-border"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {query.length > 0 && (
        <div className="rounded-md border border-border/50 overflow-hidden max-h-56 overflow-y-auto">
          {isFetching && results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">No results for "{query}"</p>
          ) : (
            <ul>
              {results.slice(0, 10).map((r) => {
                const inList = watchlist.some((w) => w.symbol === r.symbol);
                return (
                  <li key={r.symbol}>
                    <button
                      type="button"
                      disabled={inList || add.isPending}
                      onClick={() => handleAdd(r)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors",
                        inList
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-muted/30 cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-medium shrink-0">{r.symbol}</span>
                        <span className="text-muted-foreground truncate text-xs">{r.instrument_name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <span className="text-[10px] uppercase tracking-wide px-1 py-0.5 rounded bg-muted text-muted-foreground">
                          {r.instrument_type}
                        </span>
                        {inList ? (
                          <span className="text-[10px] text-emerald-400">Added</span>
                        ) : (
                          <Plus className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ---------- Priority Cycle Button ----------

function PriorityBadge({ item }: { item: WatchlistItem }) {
  const update = useUpdateWatchlistItem();
  const cycle = () => {
    const next: Record<string, "high" | "medium" | "low"> = {
      high: "medium",
      medium: "low",
      low: "high",
    };
    update.mutate({ symbol: item.symbol, priority: next[item.priority] });
  };

  return (
    <button
      type="button"
      onClick={cycle}
      disabled={update.isPending}
      className={cn(
        "text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border transition-colors duration-150 cursor-pointer",
        PRIORITY_COLORS[item.priority]
      )}
      title="Click to cycle priority"
    >
      {item.priority}
    </button>
  );
}

// ---------- Main Page ----------

export default function WatchlistPage() {
  const [showAdd, setShowAdd] = useState(false);
  const { data: watchlist = [], isLoading: wLoading } = useWatchlist();
  const symbols = watchlist.map((w) => w.symbol);
  const { data: assets = [], isLoading: aLoading } = useMarketOverview(symbols);
  const remove  = useRemoveFromWatchlist();
  const update  = useUpdateWatchlistItem();

  const isLoading = wLoading || (watchlist.length > 0 && aLoading);

  const rows: Array<{ item: WatchlistItem; asset: AssetSummary | undefined }> = watchlist
    .slice()
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    })
    .map((item) => ({ item, asset: assets.find((a) => a.symbol === item.symbol) }));

  // Summary stats
  const withData = rows.filter((r) => r.asset);
  const gainers  = withData.filter((r) => r.asset!.changePercent > 0).length;
  const losers   = withData.filter((r) => r.asset!.changePercent < 0).length;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-lg font-semibold tracking-tight">Watchlist</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {watchlist.length} symbol{watchlist.length !== 1 ? "s" : ""} tracked
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Button
            onClick={() => setShowAdd((v) => !v)}
            className={cn(
              "gap-1.5 transition-all",
              showAdd && "bg-muted text-foreground border border-border"
            )}
            variant={showAdd ? "outline" : "default"}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Symbol
          </Button>
        </motion.div>
      </div>

      {/* Add panel */}
      <AnimatePresence>
        {showAdd && <AddSymbolPanel onClose={() => setShowAdd(false)} />}
      </AnimatePresence>

      {/* Summary bar */}
      {withData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.2 }}
          className="flex items-center gap-6 px-4 py-3 rounded-lg border border-border/50 bg-card text-sm"
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-muted-foreground">{gainers} gaining</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-muted-foreground">{losers} losing</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="text-muted-foreground">{withData.length - gainers - losers} flat</span>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {watchlist.filter((w) => w.pinned).length} pinned
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!wLoading && watchlist.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center justify-center py-20 px-6 text-center gap-5 rounded-lg border border-border/50 bg-card"
        >
          <div className="rounded-full bg-muted/30 p-5">
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-1.5">
            <p className="font-medium">No symbols yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Click <strong>Add Symbol</strong> above to search and add stocks, ETFs, or crypto to your watchlist.
            </p>
          </div>
        </motion.div>
      )}

      {/* Table */}
      {(wLoading || watchlist.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="rounded-lg border border-border/50 bg-card overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/30">
                <TableHead className="w-8" />
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Volume</TableHead>
                <TableHead className="hidden md:table-cell">Priority</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {wLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border/20">
                      <TableCell><Skeleton className="h-3 w-3" /></TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                      <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-4 w-14 ml-auto" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-12" /></TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : rows.map(({ item, asset }, index) => (
                    <motion.tr
                      key={item.symbol}
                      data-slot="table-row"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.035, duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                      className="relative group border-b border-border/20 transition-colors hover:bg-muted/20"
                    >
                      {/* Left accent */}
                      <td className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

                      {/* Pin indicator */}
                      <TableCell className="py-3 pr-0">
                        {item.pinned && (
                          <Pin className="h-3 w-3 text-emerald-400/60" />
                        )}
                      </TableCell>

                      {/* Symbol + name */}
                      <TableCell className="py-3">
                        <Link
                          href={`/asset/${encodeURIComponent(item.symbol)}`}
                          className="flex items-center gap-1 group/link w-fit"
                        >
                          <div>
                            <p className="font-mono font-semibold text-sm">{item.symbol}</p>
                            {asset && (
                              <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                                {asset.name}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground/0 group-hover/link:text-muted-foreground/50 transition-colors duration-100 shrink-0" />
                        </Link>
                      </TableCell>

                      {/* Price */}
                      <TableCell className="py-3 text-right tabular-nums font-medium">
                        {aLoading || !asset ? (
                          <Skeleton className="h-4 w-20 ml-auto" />
                        ) : (
                          formatPrice(asset.price)
                        )}
                      </TableCell>

                      {/* Change */}
                      <TableCell className="py-3 text-right">
                        {aLoading || !asset ? (
                          <Skeleton className="h-4 w-24 ml-auto" />
                        ) : (
                          <PriceChangeBadge
                            change={asset.change}
                            changePercent={asset.changePercent}
                            showIcon={false}
                          />
                        )}
                      </TableCell>

                      {/* Volume */}
                      <TableCell className="py-3 text-right text-sm text-muted-foreground tabular-nums hidden sm:table-cell">
                        {aLoading || !asset ? (
                          <Skeleton className="h-4 w-14 ml-auto" />
                        ) : (
                          formatVolume(asset.volume)
                        )}
                      </TableCell>

                      {/* Priority */}
                      <TableCell className="py-3 hidden md:table-cell">
                        <PriorityBadge item={item} />
                      </TableCell>

                      {/* Type */}
                      <TableCell className="py-3 hidden lg:table-cell">
                        {asset && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {asset.assetType}
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Pin toggle */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7 transition-all duration-100",
                              item.pinned
                                ? "text-emerald-400 hover:text-emerald-400/70 hover:bg-emerald-400/10"
                                : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50"
                            )}
                            onClick={() =>
                              update.mutate({ symbol: item.symbol, pinned: !item.pinned })
                            }
                            disabled={update.isPending}
                            title={item.pinned ? "Unpin" : "Pin to top"}
                          >
                            {item.pinned ? (
                              <PinOff className="h-3.5 w-3.5" />
                            ) : (
                              <Pin className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {/* Remove */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground/40 hover:text-red-400 hover:bg-red-400/10 hover:scale-110 active:scale-95 transition-all duration-100"
                            disabled={remove.isPending}
                            onClick={() => remove.mutate(item.symbol)}
                            title="Remove"
                          >
                            {remove.isPending && remove.variables === item.symbol ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
            </TableBody>
          </Table>
        </motion.div>
      )}
    </div>
  );
}
