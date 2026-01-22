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
  confirmed: "info",
  processing: "primary",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  refunded: "danger",
};

export const orderStatusLabel: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "Préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

export const paymentStatusVariant: Record<string, BadgeVariant> = {
  pending: "warning",
  paid: "success",
  partial: "info",
  refunded: "danger",
  failed: "danger",
};

export const paymentStatusLabel: Record<string, string> = {
  pending: "En attente",
  paid: "Payé",
  partial: "Partiel",
  refunded: "Remboursé",
  failed: "Échoué",
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
