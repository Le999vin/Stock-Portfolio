import { z } from "zod";

export const CandlePointSchema = z.object({
  datetime: z.string(),
  open: z.coerce.number(),
  high: z.coerce.number(),
  low: z.coerce.number(),
  close: z.coerce.number(),
  volume: z.coerce.number(),
});

export const TimeSeriesResponseSchema = z.object({
  meta: z.object({
    symbol: z.string(),
    interval: z.string(),
    exchange: z.string().optional(),
    type: z.string().optional(),
  }),
  values: z.array(CandlePointSchema),
  status: z.literal("ok"),
});

export const QuoteResponseSchema = z.object({
  symbol: z.string(),
  name: z.string().optional(),
  exchange: z.string().optional(),
  type: z.string().optional(),
  open: z.coerce.number(),
  high: z.coerce.number(),
  low: z.coerce.number(),
  close: z.coerce.number(),
  volume: z.coerce.number(),
  change: z.coerce.number(),
  percent_change: z.coerce.number(),
  is_market_open: z.boolean().optional(),
});

export const SymbolSearchResultSchema = z.object({
  symbol: z.string(),
  instrument_name: z.string(),
  exchange: z.string(),
  instrument_type: z.string(),
  country: z.string().optional(),
  currency: z.string().optional(),
});

export const SymbolSearchResponseSchema = z.object({
  data: z.array(SymbolSearchResultSchema),
  status: z.literal("ok"),
});

export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
export type TimeSeriesResponse = z.infer<typeof TimeSeriesResponseSchema>;
export type SymbolSearchResponse = z.infer<typeof SymbolSearchResponseSchema>;
