import { Check, Clock, Package, Truck, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

interface OrderProgressTrackerProps {
  status: OrderStatus;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  className?: string;
}

const STEPS = [
  { key: 'pending', label: 'En attente', icon: Clock },
  { key: 'confirmed', label: 'Validée', icon: Check },
  { key: 'processing', label: 'Préparation', icon: Package },
  { key: 'shipped', label: 'Expédiée', icon: Truck },
  { key: 'delivered', label: 'Livrée', icon: CheckCircle },
] as const;

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
};

export function OrderProgressTracker({ 
  status, 
  shippedAt, 
  deliveredAt,
  className 
}: OrderProgressTrackerProps) {
  // Handle cancelled/refunded orders
  if (status === 'cancelled' || status === 'refunded') {
    return (
      <div className={cn("flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive", className)}>
        <XCircle className="w-5 h-5" />
        <span className="font-medium">
          {status === 'cancelled' ? 'Commande annulée' : 'Commande remboursée'}
        </span>
      </div>
    );
  }

  const currentIndex = STATUS_ORDER[status] ?? 0;

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop progress */}
      <div className="hidden sm:flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={step.key} className="flex-1 flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    isCompleted && "bg-success border-success text-success-foreground",
                    isCurrent && "bg-primary border-primary text-primary-foreground",
                    isPending && "bg-muted border-border text-muted-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center whitespace-nowrap",
                    isCompleted && "text-success",
                    isCurrent && "text-primary",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 transition-colors",
                    idx < currentIndex ? "bg-success" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile progress - vertical */}
      <div className="sm:hidden space-y-3">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                  isCompleted && "bg-success border-success text-success-foreground",
                  isCurrent && "bg-primary border-primary text-primary-foreground",
                  isPending && "bg-muted border-border text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isCompleted && "text-success",
                  isCurrent && "text-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {isCurrent && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Actuel
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
