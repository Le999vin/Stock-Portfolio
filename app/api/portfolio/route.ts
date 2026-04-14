import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { portfolios } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";

const CreateSchema = z.object({
  name:    z.string().min(1).max(60).trim(),
  isPaper: z.boolean().default(false),
});

function toPortfolio(row: typeof portfolios.$inferSelect) {
  return {
    id:          row.id,
    name:        row.name,
    currency:    row.currency,
    isDefault:   row.isDefault,
    isPaper:     row.isPaper,
    initialCash: Number(row.initialCash),
    cashBalance: Number(row.cashBalance),
    createdAt:   row.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(portfolios)
    .where(eq(portfolios.userId, session.user.id))
    .orderBy(asc(portfolios.createdAt));

  return NextResponse.json(rows.map(toPortfolio));
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Check if user already has a default portfolio
  const existing = await db
    .select({ id: portfolios.id })
    .from(portfolios)
    .where(eq(portfolios.userId, session.user.id))
    .limit(1);

  const isDefault = existing.length === 0 && !parsed.data.isPaper;

  const [row] = await db
    .insert(portfolios)
    .values({
      id:          crypto.randomUUID(),
      userId:      session.user.id,
      name:        parsed.data.name,
      isDefault,
      isPaper:     parsed.data.isPaper,
      cashBalance: "100000",
      initialCash: "100000",
    })
    .returning();

  return NextResponse.json(toPortfolio(row), { status: 201 });
}
