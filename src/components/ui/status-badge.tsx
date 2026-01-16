import { cn } from "@/lib/utils";

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "info";

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: "bg-primary-light text-primary",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning-foreground",
  danger: "bg-danger-light text-danger",
  info: "bg-info-light text-info",
};

export function StatusBadge({ variant, children }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex px-2.5 py-1 rounded-md text-xs font-medium",
      variantStyles[variant]
    )}>
      {children}
    </span>
  );
}

// Utility maps for common statuses
export const orderStatusVariant: Record<string, BadgeVariant> = {
  pending: "warning",
  processing: "info",
  shipped: "primary",
  delivered: "success",
  cancelled: "danger",
};

export const orderStatusLabel: Record<string, string> = {
  pending: "En attente",
  processing: "Préparation",
  shipped: "Expédié",
  delivered: "Livré",
  cancelled: "Annulé",
};

export const supplierTypeVariant: Record<string, BadgeVariant> = {
  purchase: "success",
  own: "primary",
  consignment: "info",
  depot_vente: "warning",
};

export const supplierTypeLabel: Record<string, string> = {
  purchase: "Achat ferme",
  own: "Propre",
  consignment: "Consignation",
  depot_vente: "Dépôt-vente",
};
