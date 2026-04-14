"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type Time,
} from "lightweight-charts";
import type { CandlePoint, ChartType } from "@/types";
import { cn } from "@/lib/utils";

interface PriceChartProps {
  data: CandlePoint[];
  chartType?: ChartType;
  className?: string;
}

export function PriceChart({ data, chartType = "candlestick", className }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Lightweight Charts only supports hex/rgb/rgba/hsl — no OKLCH
    const COLORS = {
      grid:         "#2a2a38",   // border — dark blue-gray
      text:         "#818196",   // muted foreground
      up:           "#34d399",   // emerald-400
      down:         "#f87171",   // red-400
      upWick:       "#10b981",   // emerald-500
      downWick:     "#ef4444",   // red-500
    } as const;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 360,
      layout: {
        background: { color: "transparent" },
        textColor: COLORS.text,
        fontSize: 11,
        fontFamily: "Geist, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: {
        mode: 1, // CrosshairMode.Magnet
      },
      rightPriceScale: {
        borderColor: COLORS.grid,
      },
      timeScale: {
        borderColor: COLORS.grid,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    if (chartType === "candlestick") {
      const series = chart.addSeries(CandlestickSeries, {
        upColor:         COLORS.up,
        downColor:       COLORS.down,
        borderUpColor:   COLORS.up,
        borderDownColor: COLORS.down,
        wickUpColor:     COLORS.upWick,
        wickDownColor:   COLORS.downWick,
      });
      seriesRef.current = series;
    } else {
      const series = chart.addSeries(LineSeries, {
        color:     COLORS.up,
        lineWidth: 2,
      });
      seriesRef.current = series;
    }

    // ResizeObserver for responsive width
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        chartRef.current.applyOptions({ width: entry.contentRect.width });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [chartType]); // re-mount when chart type changes

  useEffect(() => {
    if (!seriesRef.current || !Array.isArray(data) || data.length === 0) return;

    if (chartType === "candlestick") {
      const candleData: CandlestickData<Time>[] = data.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      (seriesRef.current as ISeriesApi<"Candlestick">).setData(candleData);
    } else {
      const lineData: LineData<Time>[] = data.map((d) => ({
        time: d.time as Time,
        value: d.close,
      }));
      (seriesRef.current as ISeriesApi<"Line">).setData(lineData);
    }

    chartRef.current?.timeScale().fitContent();
  }, [data, chartType]);

  return (
    <div className={cn("relative w-full", className)}>
      <div ref={containerRef} className="w-full h-full" />
      {/* TradingView Attribution — required when using lightweight-charts */}
      <a
        href="https://www.tradingview.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-1 right-2 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        Powered by TradingView
      </a>
    </div>
  );
}
