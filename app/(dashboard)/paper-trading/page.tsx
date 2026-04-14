"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  usePortfolios,
  usePortfolio,
  useCreatePortfolio,
  usePaperTrade,
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
import { formatCurrency, formatPct } from "@/lib/portfolio";
import { FlaskConical, Plus, Loader2, X } from "lucide-react";
import type { DerivedPosition, Transaction } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Trade Modal ───────────────────────────────────────────────────────────

function TradeModal({
  portfolioId,
  defaultSymbol,
  onClose,
}: {
  portfolioId: string;
  defaultSymbol?: string;
  onClose: () => void;
}) {
  const trade = usePaperTrade();
  const [symbol, setSymbol] = useState(defaultSymbol ?? "");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trade.mutate(
      { portfolioId, symbol: symbol.trim().toUpperCase(), side, quantity: Number(quantity) },
      { onSuccess: onClose }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97, y: -8 }}
      transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-lg border border-border/50 bg-card p-5 space-y-4 max-w-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Paper Trade</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Symbol</label>
          <Input
            required
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="AAPL"
            className="uppercase font-mono"
            maxLength={20}
            disabled={!!defaultSymbol}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Side</label>
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
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Quantity</label>
          <Input
            required
            type="number"
            min="0.00000001"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="10"
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          Order executes at current market price.
        </p>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={trade.isPending}
            className={cn(
              "flex-1",
              side === "sell" && "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            {trade.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : null}
            {side === "buy" ? "Buy" : "Sell"}
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
}

// ── Positions Table ───────────────────────────────────────────────────────

function PaperPositionsTable({
  positions,
  isLoading,
  onTrade,
}: {
  positions: DerivedPosition[];
  isLoading: boolean;
  onTrade: (symbol: string) => void;
}) {
  if (!isLoading && positions.length === 0) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-border/30">
            <TableHead>Symbol</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Avg Cost</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right hidden md:table-cell">Market Value</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-border/20">
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                  <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="hidden md:table-cell text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            : positions.map((pos, i) => (
                <motion.tr
                  key={pos.symbol}
                  data-slot="table-row"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.18 }}
                  className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                >
                  <TableCell className="py-3 font-mono font-semibold text-sm">
                    <Link href={`/asset/${encodeURIComponent(pos.symbol)}`} className="hover:text-emerald-400 transition-colors">
                      {pos.symbol}
                    </Link>
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums text-sm">
                    {pos.quantity.toFixed(pos.quantity < 1 ? 6 : 4)}
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums text-sm text-muted-foreground hidden sm:table-cell">
                    {formatCurrency(pos.averageCost)}
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums font-medium">
                    {pos.currentPrice > 0 ? formatCurrency(pos.currentPrice) : "—"}
                  </TableCell>
                  <TableCell className="py-3 text-right tabular-nums hidden md:table-cell">
                    {pos.currentPrice > 0 ? formatCurrency(pos.marketValue) : "—"}
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    {pos.currentPrice > 0 ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={cn("text-sm font-medium tabular-nums", pos.unrealizedPnL >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {pos.unrealizedPnL >= 0 ? "+" : ""}{formatCurrency(pos.unrealizedPnL)}
                        </span>
                        <span className={cn("text-[11px] tabular-nums", pos.unrealizedPnLPct >= 0 ? "text-emerald-400/70" : "text-red-400/70")}>
                          {formatPct(pos.unrealizedPnLPct)}
                        </span>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => onTrade(pos.symbol)}
                    >
                      Trade
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Recent Trades ─────────────────────────────────────────────────────────

function RecentTrades({ transactions }: { transactions: Transaction[] }) {
  const recent = [...transactions].reverse().slice(0, 10);
  if (recent.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Recent Trades
      </h3>
      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/30">
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
              <TableHead className="text-right hidden md:table-cell">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recent.map((tx, i) => (
              <motion.tr
                key={tx.id}
                data-slot="table-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.025 }}
                className="border-b border-border/20 hover:bg-muted/20 transition-colors"
              >
                <TableCell className="py-2.5 font-mono text-sm font-medium">{tx.symbol}</TableCell>
                <TableCell className="py-2.5">
                  <span className={cn(
                    "text-xs font-medium uppercase tracking-wide px-1.5 py-0.5 rounded",
                    tx.side === "buy"
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-red-400/10 text-red-400"
                  )}>
                    {tx.side}
                  </span>
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums text-sm">
                  {Number(tx.quantity).toFixed(Number(tx.quantity) < 1 ? 6 : 4)}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums text-sm">
                  {formatCurrency(Number(tx.price))}
                </TableCell>
                <TableCell className="py-2.5 text-right tabular-nums text-sm hidden sm:table-cell">
                  {formatCurrency(Number(tx.quantity) * Number(tx.price))}
                </TableCell>
                <TableCell className="py-2.5 text-right text-sm text-muted-foreground hidden md:table-cell">
                  {new Date(tx.executedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function PaperTradingPage() {
  const [showTrade, setShowTrade] = useState(false);
  const [tradeSymbol, setTradeSymbol] = useState<string | undefined>(undefined);

  const { data: portfolioList = [], isLoading: listLoading } = usePortfolios();
  const paperPortfolios = portfolioList.filter((p) => p.isPaper);
  const portfolioId = paperPortfolios[0]?.id;

  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(portfolioId);
  const createPortfolio = useCreatePortfolio();

  const handleOpenTrade = (symbol?: string) => {
    setTradeSymbol(symbol);
    setShowTrade(true);
  };

  const pnlPct = portfolio && portfolio.initialCash > 0
    ? ((portfolio.totalMarketValue + portfolio.cashBalance - portfolio.initialCash) / portfolio.initialCash) * 100
    : 0;
  const totalPnL = portfolio
    ? portfolio.totalMarketValue + portfolio.cashBalance - portfolio.initialCash
    : 0;

  if (listLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-7 w-44" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (paperPortfolios.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-lg font-semibold tracking-tight">Paper Trading</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Practice without real money</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
          className="flex flex-col items-center justify-center py-20 gap-5 rounded-lg border border-border/50 bg-card text-center px-6"
        >
          <div className="rounded-full bg-muted/30 p-5">
            <FlaskConical className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-1.5">
            <p className="font-medium">Start paper trading</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              You start with <strong>$100,000</strong> virtual cash. Trades execute at the current market price with zero fees.
            </p>
          </div>
          <Button
            onClick={() =>
              createPortfolio.mutate({ name: "Paper Portfolio", isPaper: true })
            }
            disabled={createPortfolio.isPending}
            className="gap-1.5"
          >
            {createPortfolio.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Create Paper Account
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-lg font-semibold tracking-tight">Paper Trading</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Simulated portfolio — no real money
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
        >
          <Button onClick={() => handleOpenTrade()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Trade
          </Button>
        </motion.div>
      </div>

      {/* Trade Modal */}
      <AnimatePresence>
        {showTrade && portfolioId && (
          <TradeModal
            portfolioId={portfolioId}
            defaultSymbol={tradeSymbol}
            onClose={() => { setShowTrade(false); setTradeSymbol(undefined); }}
          />
        )}
      </AnimatePresence>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.2 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            label: "Cash Balance",
            value: portfolioLoading ? null : formatCurrency(portfolio?.cashBalance ?? 0),
          },
          {
            label: "Holdings Value",
            value: portfolioLoading ? null : formatCurrency(portfolio?.totalMarketValue ?? 0),
          },
          {
            label: "Total P&L",
            value: portfolioLoading ? null : (
              <span className={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}>
                {totalPnL >= 0 ? "+" : ""}{formatCurrency(totalPnL)} ({formatPct(pnlPct)})
              </span>
            ),
          },
          {
            label: "Positions",
            value: portfolioLoading ? null : String(portfolio?.positions.length ?? 0),
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.04, duration: 0.2 }}
            className="rounded-lg border border-border/50 bg-card p-4 space-y-1"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            {card.value === null ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <p className="text-lg font-semibold tabular-nums leading-none">{card.value}</p>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Positions */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.2 }}
        className="space-y-2"
      >
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Open Positions
        </h2>
        {!portfolioLoading && (portfolio?.positions.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-lg border border-border/50 bg-card text-center px-6">
            <p className="text-sm text-muted-foreground">No open positions yet</p>
            <Button variant="outline" size="sm" onClick={() => handleOpenTrade()} className="gap-1.5">
              <Plus className="h-3 w-3" />
              Place your first trade
            </Button>
          </div>
        ) : (
          <PaperPositionsTable
            positions={portfolio?.positions ?? []}
            isLoading={portfolioLoading}
            onTrade={handleOpenTrade}
          />
        )}
      </motion.section>

      {/* Recent Trades */}
      {portfolioId && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.2 }}
        >
          <RecentTrades transactions={portfolio?.transactions ?? []} />
        </motion.section>
      )}
    </div>
  );
}
