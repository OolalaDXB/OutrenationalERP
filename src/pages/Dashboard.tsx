import { Euro, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";

// Demo data
const supplierPerformance = [
  { id: "1", name: "Via Parigi", type: "consignment", commissionRate: 0.20, revenue: 2847, commission: 569, payout: 2278, items: 42 },
  { id: "2", name: "Sublime Frequencies", type: "purchase", commissionRate: 0, revenue: 1923, commission: 1923, payout: 0, items: 31 },
  { id: "3", name: "Mississippi Records", type: "consignment", commissionRate: 0.25, revenue: 1456, commission: 364, payout: 1092, items: 28 },
  { id: "4", name: "Outre-National Records", type: "own", commissionRate: 0, revenue: 3210, commission: 3210, payout: 0, items: 56 },
  { id: "5", name: "Numero Group", type: "purchase", commissionRate: 0, revenue: 892, commission: 892, payout: 0, items: 15 },
];

export function Dashboard() {
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon={Euro}
          value="10 328€"
          label="Chiffre d'affaires (30j)"
          trend={{ value: "+12.5%", direction: "up" }}
          variant="primary"
        />
        <KpiCard
          icon={ShoppingCart}
          value="172"
          label="Commandes (30j)"
          trend={{ value: "+8.2%", direction: "up" }}
          variant="success"
        />
        <KpiCard
          icon={Users}
          value="5"
          label="Fournisseurs actifs"
          variant="info"
        />
        <KpiCard
          icon={AlertTriangle}
          value="7"
          label="Alertes stock"
          variant="danger"
        />
      </div>

      {/* Supplier Performance Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Performance par fournisseur</h2>
            <p className="text-sm text-muted-foreground">Période : 30 derniers jours</p>
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: "name",
              header: "Fournisseur",
              render: (item) => (
                <div>
                  <div className="font-semibold text-primary">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.items} articles vendus</div>
                </div>
              ),
            },
            {
              key: "type",
              header: "Type",
              render: (item) => (
                <StatusBadge variant={supplierTypeVariant[item.type]}>
                  {supplierTypeLabel[item.type]}
                </StatusBadge>
              ),
            },
            {
              key: "commission",
              header: "Commission",
              render: (item) => (
                <span className="text-sm tabular-nums">
                  {item.type === "consignment" ? `${(item.commissionRate * 100).toFixed(0)}%` : "—"}
                </span>
              ),
            },
            {
              key: "revenue",
              header: "CA Brut",
              render: (item) => (
                <span className="font-semibold tabular-nums">{formatCurrency(item.revenue)}</span>
              ),
            },
            {
              key: "margin",
              header: "Marge ON",
              render: (item) => (
                <span className="font-semibold tabular-nums text-success">{formatCurrency(item.commission)}</span>
              ),
            },
            {
              key: "payout",
              header: "À reverser",
              render: (item) => (
                <span className={`tabular-nums ${item.payout > 0 ? "text-info font-medium" : "text-muted-foreground"}`}>
                  {item.payout > 0 ? formatCurrency(item.payout) : "—"}
                </span>
              ),
            },
          ]}
          data={supplierPerformance}
        />
      </div>
    </div>
  );
}
