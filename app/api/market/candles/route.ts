import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/twelve-data";
import { CHART_RANGES } from "@/lib/constants";
import type { ChartRange } from "@/types";

export async function GET(request: NextRequest) {
  const symbol = request.nextUrl.searchParams.get("symbol");
  const range = request.nextUrl.searchParams.get("range") as ChartRange;

  if (!symbol || !CHART_RANGES.includes(range)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  try {
    const candles = await fetchCandles(symbol, range);
    return NextResponse.json(candles);
  } catch {
    return NextResponse.json({ error: "Candles fetch failed" }, { status: 500 });
  }
}
