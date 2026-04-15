"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useMarketOverview } from "@/lib/queries";
import { PriceChangeBadge } from "@/components/common/price-change-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";

const PULSE_SYMBOLS = ["SPY", "QQQ", "BTC/USD", "ETH/USD"];

const PULSE_LABELS: Record<string, string> = {
  "SPY":     "S&P 500",
  "QQQ":     "NASDAQ 100",
  "BTC/USD": "Bitcoin",
  "ETH/USD": "Ethereum",
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: price < 10 ? 2 : 0,
    maximumFractionDigits: price < 10 ? 2 : 0,
  }).format(price);
}

export function MarketPulse() {
  const { data: assets = [], isLoading } = useMarketOverview(PULSE_SYMBOLS);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PULSE_SYMBOLS.map((s) => (
          <Skeleton key={s} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {PULSE_SYMBOLS.map((sym, i) => {
        const asset = assets.find((a) => a.symbol === sym);
        if (!asset) return <Skeleton key={sym} className="h-20 rounded-lg" />;

        const isUp = asset.changePercent >= 0;

        return (
          <motion.div
            key={sym}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Link href={`/asset/${encodeURIComponent(sym)}`}>
              <div className="rounded-lg border border-border/50 bg-card p-4 cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:border-border hover:shadow-lg hover:shadow-black/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{PULSE_LABELS[sym]}</p>
                    <p className="font-mono font-semibold text-sm">{sym}</p>
                  </div>
                  {isUp ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400/60" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-400/60" />
                  )}
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums tracking-tight">
                    {formatPrice(asset.price)}
                  </p>
                  <PriceChangeBadge
                    change={asset.change}
                    changePercent={asset.changePercent}
                    showIcon={false}
                    className="text-xs"
                  />
                </div>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
