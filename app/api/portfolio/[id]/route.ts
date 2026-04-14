import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { portfolios, transactions } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { fetchQuote } from "@/lib/twelve-data";
import { derivePositions, enrichPositions } from "@/lib/portfolio";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(and(eq(portfolios.id, id), eq(portfolios.userId, session.user.id)))
    .limit(1);

  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const txRows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.portfolioId, id))
    .orderBy(asc(transactions.executedAt));

  const txList = txRows.map((t) => ({
    id:          t.id,
    portfolioId: t.portfolioId,
    symbol:      t.symbol,
    side:        t.side as "buy" | "sell",
    quantity:    Number(t.quantity),
    price:       Number(t.price),
    fee:         Number(t.fee),
    notes:       t.notes ?? undefined,
    executedAt:  t.executedAt.toISOString(),
    createdAt:   t.createdAt.toISOString(),
  }));

  const rawPositions = derivePositions(txList);

  // Fetch live prices for all symbols in parallel
  const symbols = rawPositions.map((p) => p.symbol);
  const quotes = await Promise.allSettled(symbols.map((s) => fetchQuote(s)));

  const priceMap: Record<string, number> = {};
  quotes.forEach((result, i) => {
    if (result.status === "fulfilled") {
      priceMap[symbols[i]] = result.value.price;
    }
  });

  const positions = enrichPositions(rawPositions, priceMap);

  const totalMarketValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const totalCost = positions.reduce((s, p) => s + p.totalCost, 0);
  const totalUnrealizedPnL = totalMarketValue - totalCost;
  const totalUnrealizedPnLPct = totalCost > 0 ? (totalUnrealizedPnL / totalCost) * 100 : 0;

  return NextResponse.json({
    id:                  portfolio.id,
    name:                portfolio.name,
    currency:            portfolio.currency,
    isDefault:           portfolio.isDefault,
    isPaper:             portfolio.isPaper,
    initialCash:         Number(portfolio.initialCash),
    cashBalance:         Number(portfolio.cashBalance),
    createdAt:           portfolio.createdAt.toISOString(),
    positions,
    transactions:        txList,
    totalMarketValue,
    totalCost,
    totalUnrealizedPnL,
    totalUnrealizedPnLPct,
  });
}
