"use client";

import { motion } from "framer-motion";
import type { ChartRange } from "@/types";
import { CHART_RANGES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ChartRangeSelectorProps {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
}

export function ChartRangeSelector({ value, onChange }: ChartRangeSelectorProps) {
  return (
    <div className="inline-flex items-center rounded-md bg-muted/30 p-0.5 h-7">
      {CHART_RANGES.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={cn(
            "relative h-5 px-2.5 text-xs rounded-sm transition-colors duration-100",
            value === range
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          {value === range && (
            <motion.div
              layoutId="range-indicator"
              className="absolute inset-0 bg-background rounded-sm"
              transition={{ type: "spring", bounce: 0.15, duration: 0.3 }}
            />
          )}
          <span className="relative z-10">{range}</span>
        </button>
      ))}
    </div>
  );
}
