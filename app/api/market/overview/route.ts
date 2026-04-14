import { NextRequest, NextResponse } from "next/server";
import { fetchQuote } from "@/lib/twelve-data";

export async function GET(request: NextRequest) {
  const symbolsParam = request.nextUrl.searchParams.get("symbols");
  if (!symbolsParam) return NextResponse.json([]);

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  try {
    const quotes = await Promise.allSettled(symbols.map(fetchQuote));
    const successful = quotes
      .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchQuote>>> => r.status === "fulfilled")
      .map((r) => r.value);
    return NextResponse.json(successful);
  } catch {
    return NextResponse.json({ error: "Overview fetch failed" }, { status: 500 });
  }
}
