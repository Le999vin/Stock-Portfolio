import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  subValue?: ReactNode;
  className?: string;
}

export function KpiCard({ label, value, subValue, className }: KpiCardProps) {
  return (
    <Card className={cn("bg-card border-border/50", className)}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {label}
        </p>
        <div className="text-xl font-semibold tabular-nums">{value}</div>
        {subValue && (
          <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
        )}
      </CardContent>
    </Card>
  );
}
