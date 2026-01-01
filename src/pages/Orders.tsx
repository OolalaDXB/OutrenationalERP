import { ShoppingCart, Package, Truck, CheckCircle } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

// Demo data
const orders = [
  { id: "1", orderNumber: "#1259", customer: "Jean Dupont", email: "jean@example.com", status: "pending", paymentStatus: "paid", total: 127.50, items: 3, createdAt: "2026-01-01T10:30:00" },
  { id: "2", orderNumber: "#1258", customer: "Marie Martin", email: "marie@example.com", status: "processing", paymentStatus: "paid", total: 89.00, items: 2, createdAt: "2025-12-31T14:15:00" },
  { id: "3", orderNumber: "#1257", customer: "Pierre Bernard", email: "pierre@example.com", status: "shipped", paymentStatus: "paid", total: 234.00, items: 5, createdAt: "2025-12-30T09:45:00" },
  { id: "4", orderNumber: "#1256", customer: "Sophie Laurent", email: "sophie@example.com", status: "delivered", paymentStatus: "paid", total: 67.00, items: 1, createdAt: "2025-12-29T16:20:00" },
  { id: "5", orderNumber: "#1255", customer: "Lucas Moreau", email: "lucas@example.com", status: "delivered", paymentStatus: "paid", total: 156.00, items: 4, createdAt: "2025-12-28T11:00:00" },
  { id: "6", orderNumber: "#1254", customer: "Emma Petit", email: "emma@example.com", status: "cancelled", paymentStatus: "refunded", total: 45.00, items: 1, createdAt: "2025-12-27T13:30:00" },
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  }).format(date);
};

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

export function OrdersPage() {
  const pendingCount = orders.filter(o => o.status === "pending").length;
  const processingCount = orders.filter(o => o.status === "processing").length;
  const shippedCount = orders.filter(o => o.status === "shipped").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard icon={ShoppingCart} value={pendingCount.toString()} label="En attente" variant="warning" />
        <KpiCard icon={Package} value={processingCount.toString()} label="En préparation" variant="info" />
        <KpiCard icon={Truck} value={shippedCount.toString()} label="Expédiées" variant="primary" />
        <KpiCard icon={CheckCircle} value={deliveredCount.toString()} label="Livrées" variant="success" />
      </div>

      {/* Filters & Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Toutes les commandes</h2>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle commande
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
            <select className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer">
              <option>Tous les statuts</option>
              <option>En attente</option>
              <option>En préparation</option>
              <option>Expédié</option>
              <option>Livré</option>
            </select>
            <input 
              type="text" 
              placeholder="Rechercher client, commande..." 
              className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
            />
          </div>

          {/* Table */}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Commande</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Client</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Statut</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Articles</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Total</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-primary">{order.orderNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-primary">
                        {order.customer.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium">{order.customer}</div>
                        <div className="text-xs text-muted-foreground">{order.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={orderStatusVariant[order.status]}>
                      {orderStatusLabel[order.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{order.items} articles</td>
                  <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(order.total)}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
