"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  usePortfolios,
  usePortfolio,
  useCreatePortfolio,
  useAddTransaction,
  useDeleteTransaction,
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
import { PriceChangeBadge } from "@/components/common/price-change-badge";
import { formatCurrency, formatPct } from "@/lib/portfolio";
import {
  Plus,
  Trash2,
  Loader2,
  Briefcase,
  ChevronDown,
  X,
} from "lucide-react";
import type { DerivedPosition, Transaction } from "@/types";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Add Transaction Modal ─────────────────────────────────────────────────

function AddTransactionModal({
  portfolioId,
  onClose,
}: {
  portfolioId: string;
  onClose: () => void;
}) {
  const add = useAddTransaction(portfolioId);
  const [form, setForm] = useState({
    symbol: "",
    side: "buy" as "buy" | "sell",
    quantity: "",
    price: "",
    fee: "",
    notes: "",
    executedAt: new Date().toISOString().slice(0, 10),
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    add.mutate(
      {
        symbol:     form.symbol.trim().toUpperCase(),
        side:       form.side,
        quantity:   Number(form.quantity),
        price:      Number(form.price),
        fee:        form.fee ? Number(form.fee) : 0,
        notes:      form.notes || undefined,
        executedAt: form.executedAt ? new Date(form.executedAt).toISOString() : undefined,
      },
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
        <p className="text-sm font-semibold">Add Transaction</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Symbol</label>
            <Input
              required
              value={form.symbol}
              onChange={(e) => set("symbol", e.target.value)}
              placeholder="AAPL"
              className="uppercase"
              maxLength={20}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Side</label>
            <div className="inline-flex h-9 w-full items-center rounded-md border border-input bg-transparent p-0.5">
              {(["buy", "sell"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("side", s)}
                  className={cn(
                    "flex-1 h-full rounded-sm text-xs font-medium capitalize transition-colors duration-100",
                    form.side === s
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Quantity</label>
            <Input
              required
              type="number"
              min="0.00000001"
              step="any"
              value={form.quantity}
              onChange={(e) => set("quantity", e.target.value)}
              placeholder="10"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Price per share</label>
            <Input
              required
              type="number"
              min="0.00000001"
              step="any"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="150.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Fee (optional)</label>
            <Input
              type="number"
              min="0"
              step="any"
              value={form.fee}
              onChange={(e) => set("fee", e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Date</label>
            <Input
              type="date"
              value={form.executedAt}
              onChange={(e) => set("executedAt", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Notes (optional)</label>
          <Input
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Why you made this trade…"
            maxLength={500}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="submit"
            disabled={add.isPending}
            className={cn(
              "flex-1",
              form.side === "sell" && "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            {add.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : null}
            {form.side === "buy" ? "Record Buy" : "Record Sell"}
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

function PositionsTable({ positions, isLoading }: { positions: DerivedPosition[]; isLoading: boolean }) {
  if (!isLoading && positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-lg border border-border/50 bg-card text-center px-6">
        <div className="rounded-full bg-muted/30 p-5">
          <Briefcase className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <div className="space-y-1.5">
          <p className="font-medium">No positions yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Click <strong>Add Transaction</strong> to record your first buy.
          </p>
        </div>
      </div>
    );
  }

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-border/20">
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell className="hidden md:table-cell text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            : positions.map((pos, i) => (
                <motion.tr
                  key={pos.symbol}
                  data-slot="table-row"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
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
                  <TableCell className="py-3 text-right tabular-nums text-sm hidden sm:table-cell text-muted-foreground">
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
                </motion.tr>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ── Transaction History ───────────────────────────────────────────────────

function TransactionHistory({
  portfolioId,
  transactions,
  isLoading,
}: {
  portfolioId: string;
  transactions: Transaction[];
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const deleteTransaction = useDeleteTransaction(portfolioId);

  const shown = expanded ? transactions : transactions.slice(0, 5);

  if (!isLoading && transactions.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Transaction History
        </h3>
        {transactions.length > 5 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            {expanded ? "Show less" : `Show all ${transactions.length}`}
            <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>

      <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/30">
              <TableHead>Symbol</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
              <TableHead className="text-right hidden md:table-cell">Date</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i} className="border-border/20">
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell className="hidden md:table-cell text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    <TableCell />
                  </TableRow>
                ))
              : [...shown].reverse().map((tx, i) => (
                  <motion.tr
                    key={tx.id}
                    data-slot="table-row"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.025 }}
                    className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="py-2.5 font-mono text-sm font-medium">
                      {tx.symbol}
                    </TableCell>
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
                      {new Date(tx.executedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        disabled={deleteTransaction.isPending}
                        onClick={() => deleteTransaction.mutate(tx.id)}
                        title="Remove transaction"
                      >
                        {deleteTransaction.isPending && deleteTransaction.variables === tx.id ? (
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
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: portfolioList = [], isLoading: listLoading } = usePortfolios();
  const realPortfolios = portfolioList.filter((p) => !p.isPaper);

  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const portfolioId = activeId ?? realPortfolios[0]?.id;

  const { data: portfolio, isLoading: portfolioLoading } = usePortfolio(portfolioId);
  const createPortfolio = useCreatePortfolio();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createPortfolio.mutate(
      { name: newName.trim() || "My Portfolio", isPaper: false },
      { onSuccess: () => { setShowCreate(false); setNewName(""); } }
    );
  };

  if (listLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-7 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (realPortfolios.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <h1 className="text-lg font-semibold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track your real holdings</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2 }}
          className="flex flex-col items-center justify-center py-20 gap-5 rounded-lg border border-border/50 bg-card text-center px-6"
        >
          <div className="rounded-full bg-muted/30 p-5">
            <Briefcase className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div className="space-y-1.5">
            <p className="font-medium">No portfolio yet</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create your first portfolio to start tracking your holdings and P&L.
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create Portfolio
          </Button>

          <AnimatePresence>
            {showCreate && (
              <motion.form
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                onSubmit={handleCreate}
                className="flex gap-2 items-center"
              >
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Portfolio name"
                  className="w-48"
                  maxLength={60}
                />
                <Button type="submit" size="sm" disabled={createPortfolio.isPending}>
                  {createPortfolio.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  const totalValue = portfolio
    ? portfolio.totalMarketValue + portfolio.cashBalance
    : 0;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-lg font-semibold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {portfolio?.name ?? "—"}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-2"
        >
          {realPortfolios.length > 1 && (
            <select
              value={portfolioId}
              onChange={(e) => setActiveId(e.target.value)}
              className="text-xs bg-card border border-border/50 rounded px-2 py-1.5 text-foreground cursor-pointer"
            >
              {realPortfolios.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <Button
            onClick={() => setShowAdd((v) => !v)}
            variant={showAdd ? "outline" : "default"}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Transaction
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreate((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            New Portfolio
          </Button>
        </motion.div>
      </div>

      {/* Create portfolio inline */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleCreate}
            className="flex gap-2 items-center px-1"
          >
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Portfolio name"
              className="w-48"
              maxLength={60}
            />
            <Button type="submit" size="sm" disabled={createPortfolio.isPending}>
              {createPortfolio.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Add Transaction Panel */}
      <AnimatePresence>
        {showAdd && portfolioId && (
          <AddTransactionModal portfolioId={portfolioId} onClose={() => setShowAdd(false)} />
        )}
      </AnimatePresence>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            label: "Total Value",
            value: portfolioLoading ? null : formatCurrency(totalValue),
          },
          {
            label: "Invested",
            value: portfolioLoading ? null : formatCurrency(portfolio?.totalCost ?? 0),
          },
          {
            label: "Unrealized P&L",
            value: portfolioLoading ? null : (
              <span className={portfolio && portfolio.totalUnrealizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}>
                {portfolio
                  ? `${portfolio.totalUnrealizedPnL >= 0 ? "+" : ""}${formatCurrency(portfolio.totalUnrealizedPnL)} (${formatPct(portfolio.totalUnrealizedPnLPct)})`
                  : "—"}
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
            transition={{ delay: 0.08 + i * 0.04, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
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

      {/* Positions Table */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="space-y-2"
      >
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Positions
        </h2>
        <PositionsTable
          positions={portfolio?.positions ?? []}
          isLoading={portfolioLoading}
        />
      </motion.section>

      {/* Transaction History */}
      {portfolioId && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <TransactionHistory
            portfolioId={portfolioId}
            transactions={portfolio?.transactions ?? []}
            isLoading={portfolioLoading}
          />
        </motion.section>
      )}
    </div>
  );
}
