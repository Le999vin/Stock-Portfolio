"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PriceChangeBadgeProps {
  change: number;
  changePercent: number;
  showIcon?: boolean;
  className?: string;
}

export function PriceChangeBadge({
  change,
  changePercent,
  showIcon = true,
  className,
}: PriceChangeBadgeProps) {
  const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";

  const colorClass =
    direction === "up"
      ? "price-up"
      : direction === "down"
      ? "price-down"
      : "price-flat";

  const Icon =
    direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  const sign = change > 0 ? "+" : "";

  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-medium tabular-nums", colorClass, className)}>
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <motion.span
        key={changePercent}
        initial={{ y: change > 0 ? 4 : change < 0 ? -4 : 0, opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {sign}{changePercent.toFixed(2)}%
      </motion.span>
      <span className="text-xs opacity-75">
        ({sign}{change.toFixed(2)})
      </span>
    </span>
  );
}
