import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchlistItem } from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { z } from "zod";

const AddSchema = z.object({
  symbol: z.string().min(1).max(20).transform((s) => s.toUpperCase()),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  pinned: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select()
    .from(watchlistItem)
    .where(eq(watchlistItem.userId, session.user.id))
    .orderBy(
      desc(watchlistItem.pinned),
      asc(watchlistItem.sortOrder),
      asc(watchlistItem.createdAt)
    );

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Duplicate check
  const existing = await db
    .select({ id: watchlistItem.id })
    .from(watchlistItem)
    .where(
      and(
        eq(watchlistItem.userId, session.user.id),
        eq(watchlistItem.symbol, parsed.data.symbol)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ error: "Symbol already in watchlist" }, { status: 409 });
  }

  const [item] = await db
    .insert(watchlistItem)
    .values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      symbol: parsed.data.symbol,
      priority: parsed.data.priority,
      pinned: parsed.data.pinned,
      sortOrder: 0,
    })
    .returning();

  return NextResponse.json(item, { status: 201 });
}
