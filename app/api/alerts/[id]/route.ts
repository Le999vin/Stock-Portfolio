import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { alerts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function toAlert(row: typeof alerts.$inferSelect) {
  return {
    id:          row.id,
    symbol:      row.symbol,
    condition:   row.condition,
    targetPrice: Number(row.targetPrice),
    isActive:    row.isActive,
    notifyVia:   row.notifyVia,
    triggeredAt: row.triggeredAt?.toISOString() ?? null,
    createdAt:   row.createdAt.toISOString(),
  };
}

/** Re-arm a triggered alert (sets isActive=true, clears triggeredAt). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [row] = await db
    .update(alerts)
    .set({ isActive: true, triggeredAt: null })
    .where(and(eq(alerts.id, id), eq(alerts.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(toAlert(row));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(alerts)
    .where(and(eq(alerts.id, id), eq(alerts.userId, session.user.id)));

  return new NextResponse(null, { status: 204 });
}
