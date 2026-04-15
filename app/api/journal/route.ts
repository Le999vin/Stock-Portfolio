import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { journalEntries } from "@/db/schema";
import { eq, and, desc, ilike } from "drizzle-orm";
import { z } from "zod";

const CreateSchema = z.object({
  title:         z.string().min(1).max(200).trim(),
  body:          z.string().min(1).max(20_000).trim(),
  symbol:        z.string().min(1).max(20).transform((s) => s.toUpperCase()).optional(),
  transactionId: z.string().uuid().optional(),
  mood:          z.number().int().min(1).max(5).optional(),
  tags:          z.array(z.string().max(30).trim()).max(20).default([]),
  entryDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const tag    = searchParams.get("tag");
  const q      = searchParams.get("q");

  const filters = [eq(journalEntries.userId, session.user.id)];
  if (symbol) filters.push(eq(journalEntries.symbol, symbol));
  if (q)      filters.push(ilike(journalEntries.title, `%${q}%`));

  const rows = await db
    .select()
    .from(journalEntries)
    .where(and(...filters))
    .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt));

  // tag filter in JS (array column – simpler than SQL for now)
  const results = tag
    ? rows.filter((r) => (r.tags as string[]).includes(tag))
    : rows;

  return NextResponse.json(results.map(toEntry));
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  const [row] = await db
    .insert(journalEntries)
    .values({
      id:            crypto.randomUUID(),
      userId:        session.user.id,
      title:         d.title,
      body:          d.body,
      symbol:        d.symbol ?? null,
      transactionId: d.transactionId ?? null,
      mood:          d.mood ?? null,
      tags:          d.tags,
      entryDate:     d.entryDate,
    })
    .returning();

  return NextResponse.json(toEntry(row), { status: 201 });
}
