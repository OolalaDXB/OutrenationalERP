import { cn } from "@/lib/utils";

interface StockIndicatorProps {
  current: number;
  threshold: number;
  showValue?: boolean;
}

export function StockIndicator({ current, threshold, showValue = true }: StockIndicatorProps) {
  const percentage = Math.min((current / (threshold * 3)) * 100, 100);
  
  let level: "high" | "medium" | "low" = "high";
  if (current <= 0) {
    level = "low";
  } else if (current <= threshold) {
    level = "medium";
  }
  
  const barColors = {
    high: "bg-success",
    medium: "bg-warning",
    low: "bg-danger",
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-1.5 rounded-full bg-border overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", barColors[level])}
          style={{ width: `${Math.max(percentage, 5)}%` }}
        />
      </div>
      {showValue && (
        <span className={cn(
          "text-sm tabular-nums",
          level === "low" && "text-danger font-medium",
          level === "medium" && "text-warning-foreground font-medium",
          level === "high" && "text-muted-foreground"
        )}>
          {current}
        </span>
      )}
    </div>
  );
}
