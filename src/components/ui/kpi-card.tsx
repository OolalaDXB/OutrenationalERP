import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  variant?: "primary" | "success" | "info" | "warning" | "danger";
}

const variantStyles = {
  primary: "bg-primary-light text-primary",
  success: "bg-success-light text-success",
  info: "bg-info-light text-info",
  warning: "bg-warning-light text-warning-foreground",
  danger: "bg-danger-light text-danger",
};

export function KpiCard({ icon: Icon, value, label, trend, variant = "primary" }: KpiCardProps) {
  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-sm animate-fade-in">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", variantStyles[variant])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
            trend.direction === "up" ? "bg-success-light text-success" : "bg-danger-light text-danger"
          )}>
            <TrendingUp className={cn("w-3.5 h-3.5", trend.direction === "down" && "rotate-180")} />
            {trend.value}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold mb-1 tabular-nums">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
