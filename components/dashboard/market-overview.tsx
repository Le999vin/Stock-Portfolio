"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useWatchlist, useMarketOverview } from "@/lib/queries";
import { AssetCard, AssetCardSkeleton } from "./asset-card";
import { DEFAULT_WATCHLIST } from "@/lib/constants";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const DEFAULT_SYMBOLS = DEFAULT_WATCHLIST.map((w) => w.symbol);

export function MarketOverview() {
  const { data: watchlist = [], isLoading: watchlistLoading } = useWatchlist();
  const isEmpty = !watchlistLoading && watchlist.length === 0;
  const symbols = isEmpty ? DEFAULT_SYMBOLS : watchlist.map((w) => w.symbol);
  const { data: assets = [], isLoading, isError } = useMarketOverview(symbols);

  if (isError) {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-6 text-center text-sm text-muted-foreground">
        Failed to load market data. Check your API key or try again.
      </div>
    );
  }

  const skeletonCount = isEmpty ? DEFAULT_SYMBOLS.length : (watchlist.length || 8);

  return (
    <div className="space-y-2">
      {isEmpty && !isLoading && (
        <p className="text-xs text-muted-foreground">
          Showing popular symbols — add to your watchlist to personalize.
        </p>
      )}
      <AnimatePresence mode="wait" initial={false}>
        {isLoading || watchlistLoading ? (
          <div
            key="skeletons"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <AssetCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <motion.div
            key="cards"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {assets.map((asset) => (
              <motion.div key={asset.symbol} variants={item}>
                <AssetCard asset={asset} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
