"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceChangeBadge } from "@/components/common/price-change-badge";
import type { AssetSummary } from "@/types";
import { cn } from "@/lib/utils";

interface AssetCardProps {
  asset: AssetSummary;
  className?: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: price < 1 ? 4 : 2,
    maximumFractionDigits: price < 1 ? 4 : 2,
  }).format(price);
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return volume.toString();
}

export function AssetCard({ asset, className }: AssetCardProps) {
  const prevPriceRef = useRef<number>(asset.price);
  const [flashKey, setFlashKey] = useState(0);
  const [flashColor, setFlashColor] = useState<"up" | "down">("up");

  useEffect(() => {
    const prev = prevPriceRef.current;
    if (prev !== asset.price) {
      setFlashColor(asset.price > prev ? "up" : "down");
      setFlashKey((k) => k + 1);
      prevPriceRef.current = asset.price;
    }
  }, [asset.price]);

  const flashBg = flashColor === "up"
    ? ["rgba(52,211,153,0.18)", "transparent"]
    : ["rgba(248,113,113,0.18)", "transparent"];

  return (
    <Link href={`/asset/${encodeURIComponent(asset.symbol)}`}>
      <Card
        className={cn(
          "bg-card border-border/50 hover:border-border cursor-pointer overflow-hidden",
          "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20",
          className
        )}
      >
        <motion.div
          key={flashKey}
          animate={flashKey > 0 ? { backgroundColor: flashBg } : {}}
          transition={{ duration: 0.6 }}
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono font-semibold text-sm leading-none">{asset.symbol}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{asset.name}</p>
              </div>
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                {asset.exchange}
              </span>
            </div>

            <div>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatPrice(asset.price)}
              </p>
              <div className="mt-1">
                <PriceChangeBadge
                  change={asset.change}
                  changePercent={asset.changePercent}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-2">
              <span>Vol</span>
              <span className="tabular-nums">{formatVolume(asset.volume)}</span>
            </div>
          </CardContent>
        </motion.div>
      </Card>
    </Link>
  );
}

export function AssetCardSkeleton() {
  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-12 rounded" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}
