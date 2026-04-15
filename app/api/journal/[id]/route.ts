import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const UpdateSchema = z.object({
  title:     z.string().min(1).max(200).trim().optional(),
  body:      z.string().min(1).max(20_000).trim().optional(),
  symbol:    z.string().min(1).max(20).transform((s) => s.toUpperCase()).optional().nullable(),
  mood:      z.number().int().min(1).max(5).optional().nullable(),
  tags:      z.array(z.string().max(30).trim()).max(20).optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function toEntry(row: typeof journalEntries.$inferSelect) {
  return {
    id:            row.id,
    title:         row.title,
    body:          row.body,
    symbol:        row.symbol ?? undefined,
    transactionId: row.transactionId ?? undefined,
    mood:          row.mood ?? undefined,
    tags:          (row.tags ?? []) as string[],
    entryDate:     row.entryDate,
    createdAt:     row.createdAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [row] = await db
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, session.user.id)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toEntry(row));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const update: Partial<typeof journalEntries.$inferInsert> = {};
  const d = parsed.data;
  if (d.title     !== undefined) update.title     = d.title;
  if (d.body      !== undefined) update.body      = d.body;
  if (d.symbol    !== undefined) update.symbol    = d.symbol;
  if (d.mood      !== undefined) update.mood      = d.mood;
  if (d.tags      !== undefined) update.tags      = d.tags;
  if (d.entryDate !== undefined) update.entryDate = d.entryDate;

  const [row] = await db
    .update(journalEntries)
    .set(update)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toEntry(row));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, session.user.id)));

  return new NextResponse(null, { status: 204 });
}
