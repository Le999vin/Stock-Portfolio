import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { portfolios, transactions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; txId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, txId } = await params;

  // Verify portfolio ownership
  const [portfolio] = await db
    .select({ id: portfolios.id })
    .from(portfolios)
    .where(and(eq(portfolios.id, id), eq(portfolios.userId, session.user.id)))
    .limit(1);

  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, txId), eq(transactions.portfolioId, id)));

  return new NextResponse(null, { status: 204 });
}
