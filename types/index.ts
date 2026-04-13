export type AssetType = "stock" | "etf" | "crypto" | "forex" | "index";

export interface AssetSummary {
  symbol: string;
  name: string;
  assetType: AssetType;
  exchange: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  isMarketOpen?: boolean;
}

export interface CandlePoint {
  time: number; // Unix timestamp in seconds (required by lightweight-charts v5)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WatchlistItem {
  id?: string;
  symbol: string;
  priority: "high" | "medium" | "low";
  pinned: boolean;
  sortOrder?: number;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  marketValue: number;
  unrealizedPnL: number;
}

export interface TradeOrder {
  side: "buy" | "sell";
  symbol: string;
  qty: number;
  orderType: "market" | "limit" | "stop";
  status: "pending" | "filled" | "cancelled" | "rejected";
  createdAt: string; // ISO 8601
}

export type ChartRange = "1D" | "1W" | "1M" | "3M" | "1Y";
export type ChartType = "candlestick" | "line";

export interface Portfolio {
  id: string;
  name: string;
  currency: string;
  isDefault: boolean;
  isPaper: boolean;
  initialCash: number;
  cashBalance: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  notes?: string;
  executedAt: string;
  createdAt: string;
}

export interface DerivedPosition {
  symbol: string;
  quantity: number;
  averageCost: number;
  totalCost: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
}

export interface PortfolioWithPositions extends Portfolio {
  positions: DerivedPosition[];
  transactions: Transaction[];
  totalMarketValue: number;
  totalCost: number;
  totalUnrealizedPnL: number;
  totalUnrealizedPnLPct: number;
}

export interface Alert {
  id: string;
  symbol: string;
  condition: "above" | "below";
  targetPrice: number;
  isActive: boolean;
  notifyVia: "email" | "push" | "both";
  triggeredAt?: string;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  symbol?: string;
  transactionId?: string;
  title: string;
  body: string;
  mood?: number;
  tags?: string[];
  entryDate: string;
  createdAt: string;
}

export interface SymbolSearchResult {
  symbol: string;
  instrument_name: string;
  exchange: string;
  instrument_type: string;
  country?: string;
  currency?: string;
}
