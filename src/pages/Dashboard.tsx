import { useState } from "react";
import { Euro, ShoppingCart, AlertTriangle, Loader2, Users } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { useDashboardKpis, useSupplierSalesView } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/format";
import { PaymentDeadlinesWidget } from "@/components/dashboard/PaymentDeadlinesWidget";
import { SupplierPayoutManager } from "@/components/suppliers/SupplierPayoutManager";
import { useSuppliers } from "@/hooks/useSuppliers";
import type { Tables } from "@/integrations/supabase/types";

type SupplierSalesRow = Tables<'v_supplier_sales'>;

export function Dashboard() {
  const { data: kpis, isLoading: kpisLoading, isError: kpisError, error: kpisErr, refetch: refetchKpis } = useDashboardKpis();
  const { data: supplierSales = [], isLoading: salesLoading, isError: salesError, error: salesErr, refetch: refetchSales } = useSupplierSalesView();
  const { data: suppliers = [] } = useSuppliers();
  const [isPayoutManagerOpen, setIsPayoutManagerOpen] = useState(false);

  const isLoading = kpisLoading || salesLoading;
  const isError = kpisError || salesError;
  const errorMessage = kpisErr instanceof Error ? kpisErr.message : salesErr instanceof Error ? salesErr.message : "Erreur inconnue";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="font-semibold text-danger">Impossible de charger le dashboard</p>
        <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
        <button
          onClick={() => { refetchKpis(); refetchSales(); }}
          className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon={Euro}
          value={formatCurrency(kpis?.revenue_30d ?? 0)}
          label="Chiffre d'affaires (30j)"
          variant="primary"
        />
        <KpiCard
          icon={ShoppingCart}
          value={(kpis?.orders_30d ?? 0).toString()}
          label="Commandes (30j)"
          variant="success"
        />
        <KpiCard
          icon={Users}
          value={(kpis?.new_customers_30d ?? 0).toString()}
          label="Nouveaux clients (30j)"
          variant="info"
        />
        <KpiCard
          icon={AlertTriangle}
          value={(kpis?.low_stock_alerts ?? 0).toString()}
          label="Alertes stock"
          variant="danger"
        />
      </div>

      {/* Payment Deadlines Widget */}
      <PaymentDeadlinesWidget onOpenPayoutManager={() => setIsPayoutManagerOpen(true)} />

      {/* Payout Manager Modal */}
      <SupplierPayoutManager
        isOpen={isPayoutManagerOpen}
        onClose={() => setIsPayoutManagerOpen(false)}
        suppliers={suppliers.map(s => ({
          id: s.id,
          name: s.name,
          type: s.type,
          commission_rate: s.commission_rate || undefined,
          email: s.email || undefined
        }))}
      />

      {/* Supplier Performance Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Performance par fournisseur</h2>
            <p className="text-sm text-muted-foreground">Toutes périodes confondues</p>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Fournisseur</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Commission</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">CA Brut</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Marge ON</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">À reverser</th>
              </tr>
            </thead>
            <tbody>
              {(supplierSales as SupplierSalesRow[]).map((item) => (
                <tr key={item.supplier_id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-primary">{item.supplier_name}</div>
                    <div className="text-xs text-muted-foreground">{item.items_sold ?? 0} articles vendus</div>
                  </td>
                  <td className="px-6 py-4">
                    {item.supplier_type && (
                      <StatusBadge variant={supplierTypeVariant[item.supplier_type]}>
                        {supplierTypeLabel[item.supplier_type]}
                      </StatusBadge>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm tabular-nums">
                      {item.supplier_type === "consignment" && item.commission_rate
                        ? `${((item.commission_rate || 0) * 100).toFixed(0)}%`
                        : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold tabular-nums">{formatCurrency(item.gross_sales)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold tabular-nums text-success">{formatCurrency(item.our_margin)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`tabular-nums ${(item.supplier_due ?? 0) > 0 ? "text-info font-medium" : "text-muted-foreground"}`}>
                      {(item.supplier_due ?? 0) > 0 ? formatCurrency(item.supplier_due) : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {supplierSales.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              Aucune donnée de vente
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
