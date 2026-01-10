import { Euro, ShoppingCart, Users, AlertTriangle, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { useDashboardKpis, useSupplierSalesView } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type SupplierSalesRow = Tables<'v_supplier_sales'>;

export function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKpis();
  const { data: supplierSales = [], isLoading: salesLoading } = useSupplierSalesView();

  const isLoading = kpisLoading || salesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          value={(kpis?.active_suppliers ?? 0).toString()}
          label="Fournisseurs actifs"
          variant="info"
        />
        <KpiCard
          icon={AlertTriangle}
          value={(kpis?.low_stock_alerts ?? 0).toString()}
          label="Alertes stock"
          variant="danger"
        />
      </div>

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
