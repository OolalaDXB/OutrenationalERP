import { X, Building2, Mail, Phone, MapPin, Package, Euro, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import type { Supplier } from "@/hooks/useSuppliers";
import { formatCurrency, formatDate } from "@/lib/format";

interface SupplierDrawerProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SupplierDrawer({ supplier, isOpen, onClose }: SupplierDrawerProps) {
  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-lg font-semibold text-primary">
              {supplier.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{supplier.name}</h2>
              <StatusBadge variant={supplierTypeVariant[supplier.type]}>
                {supplierTypeLabel[supplier.type]}
              </StatusBadge>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="bg-secondary rounded-lg p-4 space-y-3">
            {supplier.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">{supplier.email}</a>
              </div>
            )}
            {supplier.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{supplier.phone}</span>
              </div>
            )}
            {supplier.address && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{supplier.address}{supplier.city ? `, ${supplier.city}` : ''}{supplier.country ? `, ${supplier.country}` : ''}</span>
              </div>
            )}
            {supplier.contact_name && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span>Contact : {supplier.contact_name}</span>
              </div>
            )}
          </div>

          {/* Contrat */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Contrat</h3>
            <div className="bg-secondary rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Type</div>
                <div className="font-medium">{supplierTypeLabel[supplier.type]}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Commission ON</div>
                <div className="font-medium">
                  {supplier.type === "consignment" && supplier.commission_rate 
                    ? `${(supplier.commission_rate * 100).toFixed(0)}%` 
                    : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Depuis</div>
                <div className="font-medium">{formatDate(supplier.created_at)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Statut</div>
                <div className="font-medium text-success">{supplier.active ? "Actif" : "Inactif"}</div>
              </div>
            </div>
          </div>

          {/* Performance */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-secondary rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                  <Package className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{supplier.products_count || 0}</div>
                <div className="text-xs text-muted-foreground">Références</div>
              </div>
              <div className="bg-secondary rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                  <Euro className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(supplier.total_revenue)}</div>
                <div className="text-xs text-muted-foreground">CA Total</div>
              </div>
            </div>
          </div>

          {/* À reverser */}
          {(supplier.pending_payout ?? 0) > 0 && (
            <div className="bg-info-light rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-info">À reverser</div>
                  <div className="text-xs text-info/70">Période en cours</div>
                </div>
                <div className="text-2xl font-bold text-info">{formatCurrency(supplier.pending_payout)}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button className="flex-1">Voir les produits</Button>
            <Button variant="secondary" className="flex-1">Générer relevé</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
