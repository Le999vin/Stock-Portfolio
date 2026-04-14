import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { portfolios, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const AddSchema = z.object({
  symbol:     z.string().min(1).max(20).transform((s) => s.toUpperCase()),
  side:       z.enum(["buy", "sell"]),
  quantity:   z.number().positive(),
  price:      z.number().positive(),
  fee:        z.number().min(0).default(0),
  notes:      z.string().max(500).optional(),
  executedAt: z.string().datetime().optional(),
});

export async function POST(
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
  if (portfolio.isPaper) {
    return NextResponse.json(
      { error: "Use /api/paper-trade for paper portfolios" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { symbol, side, quantity, price, fee, notes, executedAt } = parsed.data;

  const [tx] = await db
    .insert(transactions)
    .values({
      id:          crypto.randomUUID(),
      portfolioId: id,
      symbol,
      side,
      quantity:    quantity.toString(),
      price:       price.toString(),
      fee:         fee.toString(),
      notes:       notes ?? null,
      executedAt:  executedAt ? new Date(executedAt) : new Date(),
    })
    .returning();

  return NextResponse.json(
    {
      id:          tx.id,
      portfolioId: tx.portfolioId,
      symbol:      tx.symbol,
      side:        tx.side,
      quantity:    Number(tx.quantity),
      price:       Number(tx.price),
      fee:         Number(tx.fee),
      notes:       tx.notes ?? undefined,
      executedAt:  tx.executedAt.toISOString(),
      createdAt:   tx.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
