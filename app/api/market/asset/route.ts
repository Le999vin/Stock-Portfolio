import { NextRequest, NextResponse } from "next/server";
import { fetchQuote } from "@/lib/twelve-data";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  if (!symbol) {
    return NextResponse.json({ error: "symbol required" }, { status: 400 });
  }

  try {
    const asset = await fetchQuote(symbol);
    return NextResponse.json(asset);
  } catch {
    return NextResponse.json({ error: "Asset fetch failed" }, { status: 500 });
  }
}
