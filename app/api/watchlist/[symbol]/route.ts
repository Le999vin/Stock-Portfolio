import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchlistItem } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const PatchSchema = z.object({
  priority: z.enum(["high", "medium", "low"]).optional(),
  pinned: z.boolean().optional(),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const symbol = decodeURIComponent((await params).symbol).toUpperCase();

  await db
    .delete(watchlistItem)
    .where(
      and(
        eq(watchlistItem.userId, session.user.id),
        eq(watchlistItem.symbol, symbol)
      )
    );

  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const symbol = decodeURIComponent((await params).symbol).toUpperCase();
  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);

  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [updated] = await db
    .update(watchlistItem)
    .set(parsed.data)
    .where(
      and(
        eq(watchlistItem.userId, session.user.id),
        eq(watchlistItem.symbol, symbol)
      )
    )
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
