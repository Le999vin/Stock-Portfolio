"use client";

import { motion } from "framer-motion";
import { MarketOverview } from "@/components/dashboard/market-overview";
import { WatchlistPanel } from "@/components/dashboard/watchlist-panel";
import { MarketPulse } from "@/components/dashboard/market-pulse";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time overview of your portfolio
        </p>
      </motion.div>

      {/* Market Pulse — always visible */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Market Pulse
        </h2>
        <MarketPulse />
      </motion.section>

      {/* Watchlist Overview */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Watchlist Overview
        </h2>
        <MarketOverview />
      </motion.section>

      {/* Watchlist Table */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <WatchlistPanel />
      </motion.section>
    </div>
  );
}
