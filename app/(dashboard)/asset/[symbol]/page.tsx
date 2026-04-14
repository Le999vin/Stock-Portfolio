"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAsset, useCandles, useWatchlist, useAddToWatchlist, useRemoveFromWatchlist, usePortfolios, usePaperTrade, useAlerts, useCreateAlert, useDeleteAlert } from "@/lib/queries";
import { PriceChangeBadge } from "@/components/common/price-change-badge";
import { KpiCard } from "@/components/common/kpi-card";
import { PriceChart } from "@/components/chart/price-chart";
import { ChartRangeSelector } from "@/components/chart/chart-range-selector";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChartRange, ChartType } from "@/types";
import { ArrowLeft, Bookmark, BookmarkCheck, Loader2, FlaskConical, X, Bell, BellOff, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  }).format(price);
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(2)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return volume.toString();
}

// ── Quick Paper Trade Widget ──────────────────────────────────────────────

function PaperTradeWidget({ symbol, onClose }: { symbol: string; onClose: () => void }) {
  const { data: portfolios = [] } = usePortfolios();
  const paperPortfolios = portfolios.filter((p) => p.isPaper);
  const trade = usePaperTrade();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");

  if (paperPortfolios.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15 }}
        className="rounded-lg border border-border/50 bg-card p-4 space-y-3 max-w-xs"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Paper Trade</p>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
        </div>
        <p className="text-sm text-muted-foreground">
          No paper account found.{" "}
          <Link href="/paper-trading" className="text-emerald-400 hover:underline">Create one →</Link>
        </p>
      </motion.div>
    );
  }

  const portfolioId = paperPortfolios[0].id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trade.mutate(
      { portfolioId, symbol, side, quantity: Number(quantity) },
      { onSuccess: onClose }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="rounded-lg border border-border/50 bg-card p-4 space-y-3 max-w-xs"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
          Paper Trade · {symbol}
        </p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="h-3.5 w-3.5" /></Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="inline-flex h-9 w-full items-center rounded-md border border-input bg-transparent p-0.5">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={cn(
                "flex-1 h-full rounded-sm text-xs font-medium capitalize transition-colors duration-100",
                side === s
                  ? s === "buy"
                    ? "bg-emerald-400/15 text-emerald-400"
                    : "bg-red-400/15 text-red-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            required
            type="number"
            min="0.00000001"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={trade.isPending}
            className={cn(side === "sell" && "bg-red-500 hover:bg-red-600 text-white")}
          >
            {trade.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : side}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Executes at current market price.</p>
      </form>
    </motion.div>
  );
}

// ── Alert Widget ──────────────────────────────────────────────────────────

function AlertWidget({
  symbol,
  currentPrice,
  onClose,
}: {
  symbol: string;
  currentPrice?: number;
  onClose: () => void;
}) {
  const { data: symbolAlerts = [], isLoading } = useAlerts(symbol);
  const create = useCreateAlert();
  const del = useDeleteAlert();
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [price, setPrice] = useState(currentPrice ? currentPrice.toFixed(2) : "");

  const formatPrice = (p: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD",
      minimumFractionDigits: p < 1 ? 4 : 2, maximumFractionDigits: p < 1 ? 4 : 2 }).format(p);

  const quickOffsets = currentPrice
    ? [
        { label: "+2%", value: +(currentPrice * 1.02).toFixed(2), c: "above" as const },
        { label: "+5%", value: +(currentPrice * 1.05).toFixed(2), c: "above" as const },
        { label: "−2%", value: +(currentPrice * 0.98).toFixed(2), c: "below" as const },
        { label: "−5%", value: +(currentPrice * 0.95).toFixed(2), c: "below" as const },
      ]
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { symbol, condition, targetPrice: Number(price) },
      { onSuccess: () => setPrice(currentPrice ? currentPrice.toFixed(2) : "") }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className="rounded-lg border border-border/50 bg-card p-4 space-y-3 w-72"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5" />
          Alerts · {symbol}
        </p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Existing alerts for this symbol */}
      {isLoading ? (
        <Skeleton className="h-8 w-full" />
      ) : symbolAlerts.length > 0 ? (
        <div className="space-y-1.5">
          {symbolAlerts.map((a) => (
            <div key={a.id} className={cn(
              "flex items-center justify-between px-2.5 py-1.5 rounded border text-xs",
              a.isActive
                ? "border-emerald-400/30 bg-emerald-400/5"
                : "border-border/30 bg-muted/20 opacity-50"
            )}>
              <span className="flex items-center gap-1">
                {a.condition === "above"
                  ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                  : <TrendingDown className="h-3 w-3 text-red-400" />}
                <span className={a.condition === "above" ? "text-emerald-400" : "text-red-400"}>
                  {a.condition}
                </span>
                <span className="font-mono tabular-nums ml-1">
                  {formatPrice(a.targetPrice)}
                </span>
              </span>
              <div className="flex items-center gap-1">
                {!a.isActive && (
                  <span className="text-[10px] text-muted-foreground">fired</span>
                )}
                <button
                  type="button"
                  onClick={() => del.mutate(a.id)}
                  disabled={del.isPending}
                  className="text-muted-foreground/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Add new alert form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="inline-flex h-8 w-full items-center rounded-md border border-input bg-transparent p-0.5">
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
              {c === "above" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {c}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          <Input
            required
            type="number"
            min="0.00000001"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Target price"
            className="flex-1 h-8 text-xs"
          />
          <Button type="submit" size="sm" disabled={create.isPending || !price} className="h-8 text-xs gap-1">
            {create.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
            Set
          </Button>
        </div>

        {quickOffsets.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {quickOffsets.map(({ label, value, c }) => (
              <button
                key={label}
                type="button"
                onClick={() => { setPrice(value.toString()); setCondition(c); }}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                  c === "above"
                    ? "border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10"
                    : "border-red-400/30 text-red-400 hover:bg-red-400/10"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </form>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function AssetPage() {
  const { symbol: rawSymbol } = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(rawSymbol);
  const [range, setRange] = useState<ChartRange>("1M");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [showPaperTrade, setShowPaperTrade] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  const isInitialLoadRef = useRef(true);

  const { data: asset, isLoading: assetLoading } = useAsset(symbol);
  const { data: candles = [], isLoading: candlesLoading } = useCandles(symbol, range);

  const isInitialLoad = candlesLoading && isInitialLoadRef.current;
  if (!candlesLoading) isInitialLoadRef.current = false;
  const { data: watchlist = [] } = useWatchlist();
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();
  const isInWatchlist = watchlist.some((w) => w.symbol === symbol);
  const watchlistPending = add.isPending || remove.isPending;
  const { data: symbolAlerts = [] } = useAlerts(symbol);
  const activeAlertCount = symbolAlerts.filter((a) => a.isActive).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Back navigation */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      {/* Asset header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          {assetLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-5 w-48" />
            </div>
          ) : asset ? (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-3xl font-bold font-mono tracking-tight">
                  {asset.symbol}
                </h1>
                <Badge variant="outline" className="text-xs uppercase">
                  {asset.assetType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {asset.exchange}
                </Badge>
                {asset.isMarketOpen !== undefined && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${asset.isMarketOpen ? "border-emerald-400/50 text-emerald-400" : "border-red-400/50 text-red-400"}`}
                  >
                    {asset.isMarketOpen ? "Open" : "Closed"}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">{asset.name}</p>
            </>
          ) : null}
        </div>

        {!assetLoading && asset && (
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-4xl font-bold tabular-nums tracking-tight">
                {formatPrice(asset.price)}
              </p>
              <div className="mt-1">
                <PriceChangeBadge
                  change={asset.change}
                  changePercent={asset.changePercent}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPaperTrade((v) => !v)}
                className={showPaperTrade ? "border-emerald-400/50 text-emerald-400 bg-emerald-400/10" : ""}
              >
                <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
                Paper Trade
              </Button>

              {/* Alert bell button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowAlerts((v) => !v); setShowPaperTrade(false); }}
                className={cn(
                  "relative",
                  showAlerts
                    ? "border-yellow-400/50 text-yellow-400 bg-yellow-400/10"
                    : activeAlertCount > 0
                    ? "border-yellow-400/40 text-yellow-400"
                    : ""
                )}
              >
                {activeAlertCount > 0 ? (
                  <BellOff className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Bell className="h-3.5 w-3.5 mr-1.5" />
                )}
                {activeAlertCount > 0 ? `${activeAlertCount} Alert${activeAlertCount > 1 ? "s" : ""}` : "Alert"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={watchlistPending}
                onClick={() =>
                  isInWatchlist ? remove.mutate(symbol) : add.mutate(symbol)
                }
                className={isInWatchlist ? "border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10" : ""}
              >
                {watchlistPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : isInWatchlist ? (
                  <BookmarkCheck className="h-3.5 w-3.5 mr-1.5" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                )}
                {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
              </Button>
            </div>

            {/* Paper trade inline widget */}
            <AnimatePresence>
              {showPaperTrade && (
                <PaperTradeWidget
                  symbol={symbol}
                  onClose={() => setShowPaperTrade(false)}
                />
              )}
            </AnimatePresence>

            {/* Alert inline widget */}
            <AnimatePresence>
              {showAlerts && (
                <AlertWidget
                  symbol={symbol}
                  currentPrice={asset?.price}
                  onClose={() => setShowAlerts(false)}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* KPI row */}
      {assetLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : asset ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Price", value: formatPrice(asset.price) },
            {
              label: "Change",
              value: (
                <PriceChangeBadge
                  change={asset.change}
                  changePercent={asset.changePercent}
                  showIcon={false}
                />
              ),
            },
            { label: "Volume", value: formatVolume(asset.volume), subValue: "24h" },
            { label: "Exchange", value: asset.exchange || "—", subValue: asset.assetType },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <KpiCard label={kpi.label} value={kpi.value} subValue={kpi.subValue} />
            </motion.div>
          ))}
        </div>
      ) : null}

      {/* Chart */}
      <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <ChartRangeSelector value={range} onChange={setRange} />
          <div className="inline-flex items-center rounded-md bg-muted/30 p-0.5 h-7">
            {(["candlestick", "line"] as ChartType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setChartType(type)}
                className={`relative h-5 px-2.5 text-xs rounded-sm transition-colors duration-100 ${
                  chartType === type ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
                }`}
              >
                {chartType === type && (
                  <motion.div
                    layoutId="chart-type-indicator"
                    className="absolute inset-0 bg-background rounded-sm"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
                  />
                )}
                <span className="relative z-10">{type === "candlestick" ? "Candle" : "Line"}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative h-52 sm:h-72 md:h-80">
          {isInitialLoad ? (
            <Skeleton className="w-full h-full rounded" />
          ) : (
            <>
              <PriceChart
                data={candles}
                chartType={chartType}
                className="h-full"
              />
              <AnimatePresence>
                {candlesLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/40 rounded backdrop-blur-[1px] z-10"
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
