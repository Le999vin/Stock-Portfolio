import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { portfolios, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { fetchQuote } from "@/lib/twelve-data";
import { derivePositions } from "@/lib/portfolio";
import { z } from "zod";

const TradeSchema = z.object({
  portfolioId: z.string().uuid(),
  symbol:      z.string().min(1).max(20).transform((s) => s.toUpperCase()),
  side:        z.enum(["buy", "sell"]),
  quantity:    z.number().positive(),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = TradeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { portfolioId, symbol, side, quantity } = parsed.data;

  // Load portfolio and verify it's a paper portfolio owned by this user
  const [portfolio] = await db
    .select()
    .from(portfolios)
    .where(
      and(
        eq(portfolios.id, portfolioId),
        eq(portfolios.userId, session.user.id)
      )
    )
    .limit(1);

  if (!portfolio) return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
  if (!portfolio.isPaper) {
    return NextResponse.json({ error: "Only paper portfolios support instant execution" }, { status: 400 });
  }

  // Get current market price
  let currentPrice: number;
  try {
    const quote = await fetchQuote(symbol);
    currentPrice = quote.price;
  } catch {
    return NextResponse.json({ error: "Could not fetch current price" }, { status: 502 });
  }

  const cashBalance = Number(portfolio.cashBalance);
  const tradeValue = quantity * currentPrice;

  if (side === "buy") {
    if (tradeValue > cashBalance) {
      return NextResponse.json(
        { error: `Insufficient cash. Required: $${tradeValue.toFixed(2)}, Available: $${cashBalance.toFixed(2)}` },
        { status: 400 }
      );
    }
  } else {
    // Verify enough shares to sell
    const txRows = await db
      .select()
      .from(transactions)
      .where(eq(transactions.portfolioId, portfolioId));

    const txList = txRows.map((t) => ({
      id: t.id, portfolioId: t.portfolioId, symbol: t.symbol,
      side: t.side as "buy" | "sell",
      quantity: Number(t.quantity), price: Number(t.price),
      fee: Number(t.fee), executedAt: t.executedAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    }));

    const positions = derivePositions(txList);
    const pos = positions.find((p) => p.symbol === symbol);
    const availableQty = pos?.quantity ?? 0;

    if (quantity > availableQty) {
      return NextResponse.json(
        { error: `Insufficient shares. Trying to sell ${quantity}, have ${availableQty.toFixed(4)}` },
        { status: 400 }
      );
    }
  }

  // Execute trade: insert transaction + update cash balance atomically
  const newCash = side === "buy" ? cashBalance - tradeValue : cashBalance + tradeValue;

  const [tx] = await db
    .insert(transactions)
    .values({
      id:          crypto.randomUUID(),
      portfolioId,
      symbol,
      side,
      quantity:    quantity.toString(),
      price:       currentPrice.toString(),
      fee:         "0",
      executedAt:  new Date(),
    })
    .returning();

  await db
    .update(portfolios)
    .set({ cashBalance: newCash.toFixed(2) })
    .where(eq(portfolios.id, portfolioId));

  return NextResponse.json({
    transaction: {
      id: tx.id, symbol: tx.symbol, side: tx.side,
      quantity: Number(tx.quantity), price: Number(tx.price),
      executedAt: tx.executedAt.toISOString(),
    },
    cashBalance: newCash,
  }, { status: 201 });
}
