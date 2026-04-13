import type { WatchlistItem, ChartRange } from "@/types";

export const TWELVE_DATA_BASE_URL = "https://api.twelvedata.com";

export const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: "AAPL",    priority: "high",   pinned: true  },
  { symbol: "MSFT",    priority: "high",   pinned: true  },
  { symbol: "GOOGL",   priority: "medium", pinned: false },
  { symbol: "NVDA",    priority: "high",   pinned: true  },
  { symbol: "BTC/USD", priority: "high",   pinned: true  },
  { symbol: "ETH/USD", priority: "medium", pinned: false },
  { symbol: "SPY",     priority: "medium", pinned: false },
  { symbol: "QQQ",     priority: "low",    pinned: false },
];

export const CHART_RANGE_INTERVALS: Record<
  ChartRange,
  { interval: string; outputSize: number }
> = {
  "1D": { interval: "5min",  outputSize: 78  }, // ~6.5h trading day
  "1W": { interval: "1h",    outputSize: 40  },
  "1M": { interval: "1day",  outputSize: 22  },
  "3M": { interval: "1day",  outputSize: 66  },
  "1Y": { interval: "1week", outputSize: 52  },
};

export const MARKET_STATUS_COLORS = {
  up:      "text-emerald-400",
  down:    "text-red-400",
  neutral: "text-zinc-400",
} as const;

export const CHART_RANGES: ChartRange[] = ["1D", "1W", "1M", "3M", "1Y"];
