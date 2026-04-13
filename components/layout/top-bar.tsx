"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { SymbolSearch } from "@/components/search/symbol-search";
import { Circle } from "lucide-react";

function MarketStatusPill() {
  // Simplified: US market is open Mon-Fri 9:30-16:00 ET
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat

  const etOffset = -4; // EDT (approx — ignores DST edge cases)
  const etHour = ((utcHour + etOffset + 24) % 24) + (utcMin / 60);
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && etHour >= 9.5 && etHour < 16;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Circle
        className={`h-2 w-2 fill-current ${isOpen ? "text-emerald-400" : "text-red-400"}`}
      />
      <span>{isOpen ? "Market Open" : "Market Closed"}</span>
    </div>
  );
}

export function TopBar() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="h-4" />
      <div className="flex flex-1 items-center gap-4">
        <div className="w-full max-w-sm">
          <SymbolSearch />
        </div>
        <div className="ml-auto">
          <MarketStatusPill />
        </div>
      </div>
    </header>
  );
}
