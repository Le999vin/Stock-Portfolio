import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const CreateSchema = z.object({
  symbol:      z.string().min(1).max(20).transform((s) => s.toUpperCase()),
  condition:   z.enum(["above", "below"]),
  targetPrice: z.number().positive(),
  notifyVia:   z.enum(["email", "push", "both"]).default("email"),
});

function toAlert(row: typeof alerts.$inferSelect) {
  return {
    id:           row.id,
    symbol:       row.symbol,
    condition:    row.condition,
    targetPrice:  Number(row.targetPrice),
    isActive:     row.isActive,
    notifyVia:    row.notifyVia,
    triggeredAt:  row.triggeredAt?.toISOString() ?? null,
    createdAt:    row.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const symbol = request.nextUrl.searchParams.get("symbol")?.toUpperCase();

  const conditions = [eq(alerts.userId, session.user.id)];
  if (symbol) conditions.push(eq(alerts.symbol, symbol));

  const rows = await db
    .select()
    .from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.createdAt));

  return NextResponse.json(rows.map(toAlert));
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { symbol, condition, targetPrice, notifyVia } = parsed.data;

  // Limit: max 50 active alerts per user
  const active = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(and(eq(alerts.userId, session.user.id), eq(alerts.isActive, true)))
    .limit(51);

  if (active.length >= 50) {
    return NextResponse.json(
      { error: "Maximum of 50 active alerts reached" },
      { status: 429 }
    );
  }

  const [row] = await db
    .insert(alerts)
    .values({
      id:          crypto.randomUUID(),
      userId:      session.user.id,
      symbol,
      condition,
      targetPrice: targetPrice.toString(),
      isActive:    true,
      notifyVia,
    })
    .returning();

  return NextResponse.json(toAlert(row), { status: 201 });
}
