"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useWatchlist, useMarketOverview, useRemoveFromWatchlist } from "@/lib/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriceChangeBadge } from "@/components/common/price-change-badge";
import { Pin, Trash2, Loader2, Search, Plus } from "lucide-react";
import type { AssetSummary, WatchlistItem } from "@/types";

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

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export function WatchlistPanel() {
  const { data: watchlist = [] } = useWatchlist();
  const symbols = watchlist.map((w) => w.symbol);
  const { data: assets = [], isLoading } = useMarketOverview(symbols);
  const remove = useRemoveFromWatchlist();

  const rows: Array<{ item: WatchlistItem; asset: AssetSummary | undefined }> =
    watchlist
      .slice()
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      })
      .map((item) => ({
        item,
        asset: assets.find((a) => a.symbol === item.symbol),
      }));

  if (watchlist.length === 0) {
    return (
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h2 className="text-sm font-semibold">Watchlist</h2>
          <span className="text-xs text-muted-foreground">0 symbols</span>
        </div>
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-4">
          <div className="rounded-full bg-muted/30 p-4">
            <Search className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Your watchlist is empty</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Search for a symbol in the top bar and visit its page to add it to your watchlist.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/80 border border-emerald-400/20 rounded-md px-3 py-1.5 bg-emerald-400/5">
            <Plus className="h-3 w-3" />
            Use the search bar above to find symbols
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h2 className="text-sm font-semibold">Watchlist</h2>
        <span className="text-xs text-muted-foreground">{watchlist.length} symbols</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/30">
            <TableHead className="w-8" />
            <TableHead>Symbol</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Change</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Volume</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ item, asset }, index) => (
            <motion.tr
              key={item.symbol}
              data-slot="table-row"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative group border-b border-border/20 transition-colors hover:bg-muted/20 cursor-pointer"
            >
              <td className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              <TableCell className="py-2 pr-0">
                {item.pinned && (
                  <Pin className="h-3 w-3 text-muted-foreground/50" />
                )}
              </TableCell>
              <TableCell className="py-2">
                <Link
                  href={`/asset/${encodeURIComponent(item.symbol)}`}
                  className="block"
                >
                  <span className="font-mono font-medium text-sm">{item.symbol}</span>
                  {asset && (
                    <span className="block text-xs text-muted-foreground truncate max-w-[140px]">
                      {asset.name}
                    </span>
                  )}
                </Link>
              </TableCell>
              <TableCell className="py-2 text-right tabular-nums font-medium">
                {isLoading || !asset ? (
                  <Skeleton className="h-4 w-20 ml-auto" />
                ) : (
                  formatPrice(asset.price)
                )}
              </TableCell>
              <TableCell className="py-2 text-right">
                {isLoading || !asset ? (
                  <Skeleton className="h-4 w-24 ml-auto" />
                ) : (
                  <PriceChangeBadge
                    change={asset.change}
                    changePercent={asset.changePercent}
                    showIcon={false}
                  />
                )}
              </TableCell>
              <TableCell className="py-2 text-right tabular-nums text-sm text-muted-foreground hidden sm:table-cell">
                {isLoading || !asset ? (
                  <Skeleton className="h-4 w-16 ml-auto" />
                ) : (
                  formatVolume(asset.volume)
                )}
              </TableCell>
              <TableCell className="py-2 hidden md:table-cell">
                {asset && (
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {asset.assetType}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground/50 hover:text-red-400 hover:bg-red-400/10 hover:scale-110 active:scale-95 transition-transform duration-100"
                  disabled={remove.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    remove.mutate(item.symbol);
                  }}
                >
                  {remove.isPending && remove.variables === item.symbol ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
