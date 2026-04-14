import { NextRequest, NextResponse } from "next/server";
import { searchSymbols } from "@/lib/twelve-data";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 1) return NextResponse.json([]);

  try {
    const results = await searchSymbols(q);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
