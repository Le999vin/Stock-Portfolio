import type { Transaction, DerivedPosition } from "@/types";

interface RawPosition {
  symbol: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
}

/**
 * Derives current positions from a list of transactions using the average cost method.
 * Transactions are processed in chronological order.
 * Positions with zero (or negligible) quantity are excluded.
 */
export function derivePositions(transactions: Transaction[]): RawPosition[] {
  const map = new Map<string, { quantity: number; averageCost: number }>();

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.executedAt).getTime() - new Date(b.executedAt).getTime()
  );

  for (const tx of sorted) {
    const qty = Number(tx.quantity);
    const price = Number(tx.price);
    const fee = Number(tx.fee ?? 0);

    if (!map.has(tx.symbol)) {
      map.set(tx.symbol, { quantity: 0, averageCost: 0 });
    }

    const pos = map.get(tx.symbol)!;

    if (tx.side === "buy") {
      const prevTotalCost = pos.quantity * pos.averageCost;
      const newQty = pos.quantity + qty;
      // Include fee in cost basis
      pos.averageCost = newQty > 0 ? (prevTotalCost + qty * price + fee) / newQty : 0;
      pos.quantity = newQty;
    } else {
      // sell: average cost unchanged, just reduce quantity
      pos.quantity = Math.max(0, pos.quantity - qty);
    }
  }

  return Array.from(map.entries())
    .filter(([, pos]) => pos.quantity > 0.000001)
    .map(([symbol, pos]) => ({
      symbol,
      quantity: pos.quantity,
      averageCost: pos.averageCost,
      totalCost: pos.quantity * pos.averageCost,
    }));
}

/**
 * Enriches raw positions with live market data to produce full DerivedPositions.
 */
export function enrichPositions(
  rawPositions: RawPosition[],
  priceMap: Record<string, number>
): DerivedPosition[] {
  return rawPositions.map((pos) => {
    const currentPrice = priceMap[pos.symbol] ?? 0;
    const marketValue = pos.quantity * currentPrice;
    const unrealizedPnL = marketValue - pos.totalCost;
    const unrealizedPnLPct = pos.totalCost > 0 ? (unrealizedPnL / pos.totalCost) * 100 : 0;

    return {
      ...pos,
      currentPrice,
      marketValue,
      unrealizedPnL,
      unrealizedPnLPct,
    };
  });
}

export function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: Math.abs(value) < 1 && value !== 0 ? 4 : 2,
    maximumFractionDigits: Math.abs(value) < 1 && value !== 0 ? 4 : 2,
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}
