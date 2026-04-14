"use client";

import { motion } from "framer-motion";
import { useMarketOverview } from "@/lib/queries";
import { AssetCard, AssetCardSkeleton } from "@/components/dashboard/asset-card";
import { PriceChangeBadge } from "@/components/common/price-change-badge";
import type { AssetSummary } from "@/types";

const INDEX_SYMBOLS = ["SPY", "QQQ", "DIA", "IWM"];
const SECTOR_SYMBOLS = ["XLK", "XLF", "XLE", "XLV", "XLI", "XLC", "XLY", "XLP", "XLU", "XLRE", "XLB"];

const SECTOR_NAMES: Record<string, string> = {
  XLK:  "Technology",
  XLF:  "Financials",
  XLE:  "Energy",
  XLV:  "Health Care",
  XLI:  "Industrials",
  XLC:  "Communication",
  XLY:  "Consumer Disc.",
  XLP:  "Consumer Staples",
  XLU:  "Utilities",
  XLRE: "Real Estate",
  XLB:  "Materials",
};

const ALL_SYMBOLS = [...INDEX_SYMBOLS, ...SECTOR_SYMBOLS];

function TopMoversPanel({ assets }: { assets: AssetSummary[] }) {
  const sorted = [...assets].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
  const gainers = sorted.filter((a) => a.changePercent > 0).slice(0, 5);
  const losers  = sorted.filter((a) => a.changePercent < 0).slice(0, 5);

  function MoverList({ items, label }: { items: AssetSummary[]; label: string }) {
    return (
      <div className="rounded-lg border border-border/50 bg-card">
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-sm font-semibold">{label}</h3>
        </div>
        <ul className="divide-y divide-border/20">
          {items.map((a) => (
            <li key={a.symbol} className="flex items-center justify-between px-4 py-2.5">
              <span className="font-mono text-sm font-medium">{a.symbol}</span>
              <PriceChangeBadge change={a.change} changePercent={a.changePercent} showIcon={false} />
            </li>
          ))}
          {items.length === 0 && (
            <li className="px-4 py-4 text-xs text-muted-foreground text-center">No data</li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <MoverList items={gainers} label="Top Gainers" />
      <MoverList items={losers}  label="Top Losers"  />
    </div>
  );
}

function SectorBar({ asset, max }: { asset: AssetSummary; max: number }) {
  const pct = asset.changePercent;
  const width = `${Math.min(Math.abs(pct) / max, 1) * 100}%`;
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 text-xs text-muted-foreground shrink-0">
        {SECTOR_NAMES[asset.symbol] ?? asset.symbol}
      </span>
      <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 0 ? "bg-emerald-400" : "bg-red-400"}`}
          style={{ width }}
        />
      </div>
      <PriceChangeBadge change={pct} changePercent={pct} showIcon={false} className="text-xs w-20 justify-end" />
    </div>
  );
}

export default function MarketsPage() {
  const { data: assets = [], isLoading, isError } = useMarketOverview(ALL_SYMBOLS);

  const indexAssets  = assets.filter((a) => INDEX_SYMBOLS.includes(a.symbol));
  const sectorAssets = assets.filter((a) => SECTOR_SYMBOLS.includes(a.symbol));
  const maxChange    = Math.max(...sectorAssets.map((a) => Math.abs(a.changePercent)), 1);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Markets</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          US indices, sector performance, and top movers
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-border/50 bg-card p-6 text-center text-sm text-muted-foreground">
          Failed to load market data. Check your API key.
        </div>
      )}

      {/* Indices */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Major Indices</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <AssetCardSkeleton key={i} />)
            : indexAssets.map((a) => <AssetCard key={a.symbol} asset={a} />)}
        </div>
      </motion.section>

      {/* Sector performance */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Sector Performance</h2>
        <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-36 h-3 bg-muted/30 rounded animate-pulse" />
                  <div className="flex-1 h-2 bg-muted/30 rounded-full animate-pulse" />
                  <div className="w-20 h-3 bg-muted/30 rounded animate-pulse" />
                </div>
              ))
            : sectorAssets
                .sort((a, b) => b.changePercent - a.changePercent)
                .map((a) => <SectorBar key={a.symbol} asset={a} max={maxChange} />)}
        </div>
      </motion.section>

      {/* Top movers */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">Top Movers</h2>
        <TopMoversPanel assets={assets} />
      </motion.section>
    </div>
  );
}
