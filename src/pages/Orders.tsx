import { useState, useMemo } from "react";
import { ShoppingCart, Package, Truck, CheckCircle, Plus } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { OrderDrawer } from "@/components/drawers/OrderDrawer";
import { orders, Order, formatCurrency, formatDateTime } from "@/data/demo-data";

export function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filtrage
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchTerm === "" ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const processingCount = orders.filter(o => o.status === "processing").length;
  const shippedCount = orders.filter(o => o.status === "shipped").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedOrder(null);
  };

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
            <select
              className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="processing">En préparation</option>
              <option value="shipped">Expédié</option>
              <option value="delivered">Livré</option>
              <option value="cancelled">Annulé</option>
            </select>
            <input
              type="text"
              placeholder="Rechercher client, commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(order)}
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-primary">{order.orderNumber}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-primary">
                        {order.customerName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge variant={orderStatusVariant[order.status]}>
                      {orderStatusLabel[order.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{order.items.length} articles</td>
                  <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(order.total)}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              Aucune commande trouvée
            </div>
          )}
        </div>
      </div>

      {/* Order Drawer */}
      <OrderDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
