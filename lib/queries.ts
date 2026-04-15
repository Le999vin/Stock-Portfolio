import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ChartRange, AssetSummary, CandlePoint, WatchlistItem, SymbolSearchResult, Portfolio, PortfolioWithPositions, Transaction, Alert, JournalEntry } from "@/types";

async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useWatchlist() {
  return useQuery<WatchlistItem[]>({
    queryKey: ["watchlist"],
    queryFn: () => apiFetch<WatchlistItem[]>("/api/watchlist"),
    staleTime: 5 * 60_000,
  });
}

export function useMarketOverview(symbols: string[]) {
  return useQuery<AssetSummary[]>({
    queryKey: ["market", "overview", symbols],
    queryFn: () =>
      apiFetch<AssetSummary[]>(`/api/market/overview?symbols=${symbols.join(",")}`),
    enabled: symbols.length > 0,
    refetchInterval: 60_000,
  });
}

export function useAsset(symbol: string) {
  return useQuery<AssetSummary>({
    queryKey: ["market", "asset", symbol],
    queryFn: () =>
      apiFetch<AssetSummary>(`/api/market/asset?symbol=${encodeURIComponent(symbol)}`),
    enabled: !!symbol,
    refetchInterval: 30_000,
  });
}

export function useCandles(symbol: string, range: ChartRange) {
  return useQuery<CandlePoint[]>({
    queryKey: ["market", "candles", symbol, range],
    queryFn: () =>
      apiFetch<CandlePoint[]>(
        `/api/market/candles?symbol=${encodeURIComponent(symbol)}&range=${range}`
      ),
    enabled: !!symbol,
    staleTime: 60_000,
  });
}

export function useSymbolSearch(query: string) {
  return useQuery<SymbolSearchResult[]>({
    queryKey: ["market", "search", query],
    queryFn: () =>
      apiFetch<SymbolSearchResult[]>(`/api/market/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 1,
    staleTime: 3_600_000,
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (symbol: string) =>
      apiFetch<WatchlistItem>("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      }),
    onSuccess: (_, symbol) => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success(`${symbol} added to watchlist`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateWatchlistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      symbol,
      ...data
    }: { symbol: string; priority?: "high" | "medium" | "low"; pinned?: boolean }) =>
      apiFetch<WatchlistItem>(`/api/watchlist/${encodeURIComponent(symbol)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlist"] }),
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (symbol: string) => {
      const res = await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watchlist"] });
      toast.success("Removed from watchlist");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Portfolio ──────────────────────────────────────────────────────────────

export function usePortfolios() {
  return useQuery<Portfolio[]>({
    queryKey: ["portfolios"],
    queryFn: () => apiFetch<Portfolio[]>("/api/portfolio"),
    staleTime: 5 * 60_000,
  });
}

export function usePortfolio(id: string | undefined) {
  return useQuery<PortfolioWithPositions>({
    queryKey: ["portfolio", id],
    queryFn: () => apiFetch<PortfolioWithPositions>(`/api/portfolio/${id}`),
    enabled: !!id,
    refetchInterval: 60_000,
  });
}

export function useCreatePortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; isPaper?: boolean }) =>
      apiFetch<Portfolio>("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolios"] });
      toast.success("Portfolio created");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddTransaction(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      symbol: string;
      side: "buy" | "sell";
      quantity: number;
      price: number;
      fee?: number;
      notes?: string;
      executedAt?: string;
    }) =>
      apiFetch<Transaction>(`/api/portfolio/${portfolioId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio", portfolioId] });
      toast.success("Transaction added");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteTransaction(portfolioId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (txId: string) => {
      const res = await fetch(
        `/api/portfolio/${portfolioId}/transactions/${txId}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio", portfolioId] });
      toast.success("Transaction removed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Paper Trading ──────────────────────────────────────────────────────────

export function usePaperTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      portfolioId: string;
      symbol: string;
      side: "buy" | "sell";
      quantity: number;
    }) =>
      apiFetch<{ transaction: Transaction; cashBalance: number }>("/api/paper-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ["portfolio", vars.portfolioId] });
      qc.invalidateQueries({ queryKey: ["portfolios"] });
      toast.success(
        `${vars.side === "buy" ? "Bought" : "Sold"} ${vars.quantity} × ${vars.symbol}`
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Alerts ─────────────────────────────────────────────────────────────────

export function useAlerts(symbol?: string) {
  const qs = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
  return useQuery<Alert[]>({
    queryKey: ["alerts", symbol ?? "all"],
    queryFn: () => apiFetch<Alert[]>(`/api/alerts${qs}`),
    staleTime: 30_000,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      symbol: string;
      condition: "above" | "below";
      targetPrice: number;
      notifyVia?: "email" | "push" | "both";
    }) =>
      apiFetch<Alert>("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success(`Alert set for ${vars.symbol}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRearmAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<Alert>(`/api/alerts/${id}`, { method: "PATCH" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert re-armed");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

// ── Journal ────────────────────────────────────────────────────────────────

export function useJournalEntries(filters?: { symbol?: string; tag?: string; q?: string }) {
  const params = new URLSearchParams();
  if (filters?.symbol) params.set("symbol", filters.symbol);
  if (filters?.tag)    params.set("tag",    filters.tag);
  if (filters?.q)      params.set("q",      filters.q);
  const qs = params.toString() ? `?${params.toString()}` : "";

  return useQuery<JournalEntry[]>({
    queryKey: ["journal", filters ?? {}],
    queryFn: () => apiFetch<JournalEntry[]>(`/api/journal${qs}`),
    staleTime: 60_000,
  });
}

export function useJournalEntry(id: string | undefined) {
  return useQuery<JournalEntry>({
    queryKey: ["journal", "entry", id],
    queryFn: () => apiFetch<JournalEntry>(`/api/journal/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      body: string;
      entryDate: string;
      symbol?: string;
      mood?: number;
      tags?: string[];
    }) =>
      apiFetch<JournalEntry>("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      toast.success("Entry saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateJournalEntry(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title?: string;
      body?: string;
      entryDate?: string;
      symbol?: string | null;
      mood?: number | null;
      tags?: string[];
    }) =>
      apiFetch<JournalEntry>(`/api/journal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["journal", "entry", id] });
      toast.success("Entry updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["journal"] });
      toast.success("Entry deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
