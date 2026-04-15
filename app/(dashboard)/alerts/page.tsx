"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useAlerts,
  useCreateAlert,
  useRearmAlert,
  useDeleteAlert,
  useMarketOverview,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  BellRing,
  Plus,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  Search,
} from "lucide-react";
import type { Alert, SymbolSearchResult } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  }).format(price);
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Symbol Search Input ───────────────────────────────────────────────────

function SymbolSearchInput({
  value,
  onChange,
  onSelect,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (r: SymbolSearchResult) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQ = useDebounce(value, 280);
  const { data: results = [], isFetching } = useSymbolSearch(debouncedQ);

  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? "Search ticker…"}
        className="pl-8 uppercase"
        maxLength={20}
      />
      {open && value.length >= 1 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 rounded-md border border-border/50 bg-card shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {isFetching && results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">No results</p>
          ) : (
            <ul>
              {results.slice(0, 8).map((r) => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    onMouseDown={() => { onSelect(r); setOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/30 text-left transition-colors"
                  >
                    <span className="font-mono font-medium">{r.symbol}</span>
                    <span className="text-xs text-muted-foreground truncate ml-2">{r.instrument_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create Alert Form ─────────────────────────────────────────────────────

function CreateAlertForm({
  defaultSymbol,
  defaultPrice,
  onClose,
}: {
  defaultSymbol?: string;
  defaultPrice?: number;
  onClose: () => void;
}) {
  const create = useCreateAlert();
  const [symbol, setSymbol] = useState(defaultSymbol ?? "");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [price, setPrice] = useState(defaultPrice ? defaultPrice.toFixed(2) : "");

  const quickOffsets = defaultPrice
    ? [
        { label: "+2%", value: +(defaultPrice * 1.02).toFixed(2) },
        { label: "+5%", value: +(defaultPrice * 1.05).toFixed(2) },
        { label: "−2%", value: +(defaultPrice * 0.98).toFixed(2) },
        { label: "−5%", value: +(defaultPrice * 0.95).toFixed(2) },
      ]
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { symbol: symbol.trim().toUpperCase(), condition, targetPrice: Number(price) },
      { onSuccess: onClose }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -8 }}
      transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg border border-border/50 bg-card p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          New Price Alert
        </p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Symbol */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Symbol</label>
          {defaultSymbol ? (
            <div className="h-9 flex items-center px-3 rounded-md border border-border/50 bg-muted/20 font-mono text-sm font-medium">
              {symbol}
            </div>
          ) : (
            <SymbolSearchInput
              value={symbol}
              onChange={setSymbol}
              onSelect={(r) => setSymbol(r.symbol)}
              placeholder="Search ticker or company…"
            />
          )}
        </div>

        {/* Condition toggle */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Trigger when price is…</label>
          <div className="inline-flex h-9 w-full items-center rounded-md border border-input bg-transparent p-0.5">
            {(["above", "below"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCondition(c)}
                className={cn(
                  "flex-1 h-full rounded-sm text-xs font-medium capitalize transition-colors duration-100 flex items-center justify-center gap-1",
                  condition === c
                    ? c === "above"
                      ? "bg-emerald-400/15 text-emerald-400"
                      : "bg-red-400/15 text-red-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {c === "above"
                  ? <TrendingUp className="h-3 w-3" />
                  : <TrendingDown className="h-3 w-3" />}
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Target price */}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Target price</label>
          <Input
            required
            type="number"
            min="0.00000001"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
          {quickOffsets.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-muted-foreground">Quick:</span>
              {quickOffsets.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setPrice(value.toString()); setCondition(label.startsWith("+") ? "above" : "below"); }}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                    label.startsWith("+")
                      ? "border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10"
                      : "border-red-400/30 text-red-400 hover:bg-red-400/10"
                  )}
                >
                  {label} · {formatPrice(value)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={create.isPending || !symbol || !price} className="flex-1 gap-1.5">
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            Set Alert
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </motion.div>
  );
}

// ── Alert Row ─────────────────────────────────────────────────────────────

function AlertRow({
  alert,
  currentPrice,
  index,
}: {
  alert: Alert;
  currentPrice?: number;
  index: number;
}) {
  const rearm = useRearmAlert();
  const del = useDeleteAlert();

  const distance = currentPrice
    ? ((alert.targetPrice - currentPrice) / currentPrice) * 100
    : null;

  const triggered = !alert.isActive && alert.triggeredAt;

  return (
    <motion.tr
      data-slot="table-row"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "relative group border-b border-border/20 transition-colors",
        triggered ? "opacity-60 hover:opacity-80" : "hover:bg-muted/20"
      )}
    >
      {/* Active left accent */}
      {alert.isActive && (
        <td className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
      )}

      {/* Symbol */}
      <TableCell className="py-3 font-mono font-semibold text-sm">
        <Link
          href={`/asset/${encodeURIComponent(alert.symbol)}`}
          className="hover:text-emerald-400 transition-colors"
        >
          {alert.symbol}
        </Link>
      </TableCell>

      {/* Condition */}
      <TableCell className="py-3">
        <span className={cn(
          "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border",
          alert.condition === "above"
            ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/8"
            : "border-red-400/40 text-red-400 bg-red-400/8"
        )}>
          {alert.condition === "above"
            ? <TrendingUp className="h-3 w-3" />
            : <TrendingDown className="h-3 w-3" />}
          {alert.condition}
        </span>
      </TableCell>

      {/* Target price */}
      <TableCell className="py-3 text-right tabular-nums font-medium">
        {formatPrice(alert.targetPrice)}
      </TableCell>

      {/* Current price / distance */}
      <TableCell className="py-3 text-right hidden sm:table-cell">
        {currentPrice ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-sm tabular-nums">{formatPrice(currentPrice)}</span>
            {distance !== null && (
              <span className={cn(
                "text-[11px] tabular-nums",
                distance > 0 ? "text-emerald-400/70" : "text-red-400/70"
              )}>
                {distance > 0 ? "+" : ""}{distance.toFixed(2)}% away
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="py-3 hidden md:table-cell">
        {alert.isActive ? (
          <Badge variant="outline" className="border-emerald-400/40 text-emerald-400 bg-emerald-400/8 text-[10px] gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-[10px] gap-1">
            <BellOff className="h-3 w-3" />
            Triggered
          </Badge>
        )}
      </TableCell>

      {/* Date info */}
      <TableCell className="py-3 text-right text-xs text-muted-foreground hidden lg:table-cell">
        {triggered ? (
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground/60">triggered</p>
            <p>{new Date(alert.triggeredAt!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground/60">created</p>
            <p>{new Date(alert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
          </div>
        )}
      </TableCell>

      {/* Actions */}
      <TableCell className="py-3">
        <div className="flex items-center justify-end gap-1">
          {triggered && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/40 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
              disabled={rearm.isPending}
              onClick={() => rearm.mutate(alert.id)}
              title="Re-arm alert"
            >
              {rearm.isPending && rearm.variables === alert.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            disabled={del.isPending}
            onClick={() => del.mutate(alert.id)}
            title="Delete alert"
          >
            {del.isPending && del.variables === alert.id
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </TableCell>
    </motion.tr>
  );
}

// ── Alerts Table ──────────────────────────────────────────────────────────

function AlertsTable({
  alerts,
  priceMap,
  isLoading,
  emptyLabel,
}: {
  alerts: Alert[];
  priceMap: Record<string, number>;
  isLoading: boolean;
  emptyLabel: string;
}) {
  if (!isLoading && alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-1">{emptyLabel}</p>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/30">
            <TableHead>Symbol</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead className="text-right">Target</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Current</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="hidden lg:table-cell text-right">Date</TableHead>
            <TableHead className="text-right w-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-border/20">
                  <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right hidden sm:table-cell"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="hidden lg:table-cell text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            : alerts.map((alert, i) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  currentPrice={priceMap[alert.symbol]}
                  index={i}
                />
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const { data: allAlerts = [], isLoading } = useAlerts();

  const activeAlerts   = allAlerts.filter((a) => a.isActive);
  const triggeredAlerts = allAlerts.filter((a) => !a.isActive);

  // Fetch live prices for all unique symbols in active alerts
  const activeSymbols = [...new Set(activeAlerts.map((a) => a.symbol))];
  const { data: quotes = [] } = useMarketOverview(activeSymbols);
  const priceMap: Record<string, number> = {};
  quotes.forEach((q) => { priceMap[q.symbol] = q.price; });

  // Also build a map including triggered symbols (no refetch needed — triggered are history)
  const allPriceMap = { ...priceMap };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-lg font-semibold tracking-tight">Price Alerts</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeAlerts.length} active · {triggeredAlerts.length} triggered
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Button
            onClick={() => setShowCreate((v) => !v)}
            variant={showCreate ? "outline" : "default"}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New Alert
          </Button>
        </motion.div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <CreateAlertForm onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>

      {/* Summary strip */}
      {!isLoading && allAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.06, duration: 0.2 }}
          className="flex items-center gap-6 px-4 py-3 rounded-lg border border-border/50 bg-card text-sm"
        >
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-muted-foreground">{activeAlerts.length} watching</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BellRing className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-muted-foreground">{triggeredAlerts.length} fired</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">
              {[...new Set(allAlerts.map((a) => a.symbol))].length} symbols tracked
            </span>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!isLoading && allAlerts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center justify-center py-20 gap-5 rounded-lg border border-border/50 bg-card text-center px-6"
        >
          <div className="rounded-full bg-muted/30 p-5">
            <Bell className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-1.5">
            <p className="font-medium">No alerts yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Set a price alert to get notified when a stock crosses your target. You can also set alerts directly from any asset page.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create your first alert
          </Button>
        </motion.div>
      )}

      {/* Active alerts */}
      {(isLoading || activeAlerts.length > 0) && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-2"
        >
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </h2>
          <AlertsTable
            alerts={activeAlerts}
            priceMap={allPriceMap}
            isLoading={isLoading}
            emptyLabel="No active alerts."
          />
        </motion.section>
      )}

      {/* Triggered / History */}
      {triggeredAlerts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-2"
        >
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <BellRing className="h-3 w-3" />
            History
          </h2>
          <AlertsTable
            alerts={triggeredAlerts}
            priceMap={allPriceMap}
            isLoading={false}
            emptyLabel=""
          />
        </motion.section>
      )}
    </div>
  );
}
