import { Euro, ShoppingCart, Users, AlertTriangle, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { useDashboardKpis, useSupplierSalesView } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/format";

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

        <DataTable
          columns={[
            {
              key: "name",
              header: "Fournisseur",
              render: (item) => (
                <div>
                  <div className="font-semibold text-primary">{item.supplier_name}</div>
                  <div className="text-xs text-muted-foreground">{item.items_sold ?? 0} articles vendus</div>
                </div>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (item) => item.supplier_type ? (
                <StatusBadge variant={supplierTypeVariant[item.supplier_type]}>
                  {supplierTypeLabel[item.supplier_type]}
                </StatusBadge>
              ) : null,
            },
            {
              key: "commission",
              header: "Commission",
              render: (item) => (
                <span className="text-sm tabular-nums">
                  {item.supplier_type === "consignment" && item.commission_rate
                    ? `${(item.commission_rate * 100).toFixed(0)}%` 
                    : "—"}
                </span>
              ),
            },
            {
              key: "revenue",
              header: "CA Brut",
              render: (item) => (
                <span className="font-semibold tabular-nums">{formatCurrency(item.gross_sales)}</span>
              ),
            },
            {
              key: "margin",
              header: "Marge ON",
              render: (item) => (
                <span className="font-semibold tabular-nums text-success">{formatCurrency(item.our_margin)}</span>
              ),
            },
            {
              key: "payout",
              header: "À reverser",
              render: (item) => (
                <span className={`tabular-nums ${(item.supplier_due ?? 0) > 0 ? "text-info font-medium" : "text-muted-foreground"}`}>
                  {(item.supplier_due ?? 0) > 0 ? formatCurrency(item.supplier_due) : "—"}
                </span>
              ),
            },
          ]}
          data={supplierSales}
        />
      </div>
    </div>
  );
}
