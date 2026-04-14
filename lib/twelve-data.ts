import {
  TimeSeriesResponseSchema,
  QuoteResponseSchema,
  SymbolSearchResponseSchema,
} from "./schemas";
import { TWELVE_DATA_BASE_URL, CHART_RANGE_INTERVALS } from "./constants";
import type { AssetSummary, CandlePoint, ChartRange, SymbolSearchResult } from "@/types";

const TTL_MS = {
  quote: 30_000,
  candles: 60_000,
  search: 3_600_000,
} as const;

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const responseCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();

function getApiKey(): string {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) throw new Error("TWELVE_DATA_API_KEY is not set");
  return key;
}

function buildUrl(
  endpoint: string,
  params: Record<string, string | number>
): URL {
  const url = new URL(`${TWELVE_DATA_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  url.searchParams.set("apikey", getApiKey());
  return url;
}

function getCachedValue<T>(key: string): T | null {
  const entry = responseCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCachedValue<T>(key: string, value: T, ttlMs: number): T {
  responseCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  return value;
}

async function withMemoryCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const cached = getCachedValue<T>(key);
  if (cached !== null) return cached;

  const inFlight = inFlightRequests.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  const request = loader()
    .then((value) => setCachedValue(key, value, ttlMs))
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return request;
}

export async function fetchCandles(
  symbol: string,
  range: ChartRange
): Promise<CandlePoint[]> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  return withMemoryCache(
    `candles:${normalizedSymbol}:${range}`,
    TTL_MS.candles,
    async () => {
      const { interval, outputSize } = CHART_RANGE_INTERVALS[range];
      const url = buildUrl("/time_series", {
        symbol: normalizedSymbol,
        interval,
        outputsize: outputSize,
        format: "JSON",
      });

      const res = await fetch(url.toString(), { next: { revalidate: 60 } });
      if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`);

      const json = await res.json();
      const parsed = TimeSeriesResponseSchema.parse(json);

      // Twelve Data returns newest-first; lightweight-charts requires oldest-first
      return parsed.values.reverse().map((v) => ({
        time: Math.floor(new Date(v.datetime).getTime() / 1000),
        open: v.open,
        high: v.high,
        low: v.low,
        close: v.close,
        volume: v.volume,
      }));
    }
  );
}

export async function fetchQuote(symbol: string): Promise<AssetSummary> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  return withMemoryCache(`quote:${normalizedSymbol}`, TTL_MS.quote, async () => {
    const url = buildUrl("/quote", { symbol: normalizedSymbol });
    const res = await fetch(url.toString(), { next: { revalidate: 30 } });
    if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`);

    const json = await res.json();
    const parsed = QuoteResponseSchema.parse(json);

    return {
      symbol: parsed.symbol,
      name: parsed.name ?? parsed.symbol,
      assetType: (parsed.type?.toLowerCase() as AssetSummary["assetType"]) ?? "stock",
      exchange: parsed.exchange ?? "",
      price: parsed.close,
      change: parsed.change,
      changePercent: parsed.percent_change,
      volume: parsed.volume,
      isMarketOpen: parsed.is_market_open,
    };
  });
}

export async function searchSymbols(
  query: string
): Promise<SymbolSearchResult[]> {
  const normalizedQuery = query.trim().toUpperCase();
  return withMemoryCache(`search:${normalizedQuery}`, TTL_MS.search, async () => {
    const url = buildUrl("/symbol_search", {
      symbol: normalizedQuery,
      outputsize: 10,
    });
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`);

    const json = await res.json();
    return SymbolSearchResponseSchema.parse(json).data;
  });
}
