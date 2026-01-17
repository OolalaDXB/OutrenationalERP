import { useState, useMemo, useCallback } from "react";
import { ShoppingCart, Package, Truck, CheckCircle, Plus, Loader2, X, CreditCard, MoreHorizontal, Trash2 } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { OrderDrawer } from "@/components/drawers/OrderDrawer";
import { OrderFormModal } from "@/components/forms/OrderFormModal";
import { OrderImportModal } from "@/components/orders/OrderImportModal";
import { useOrdersWithItems, useUpdateOrderStatus, useCancelOrder, useUpdateOrder, useDeleteOrder } from "@/hooks/useOrders";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { exportToXLS } from "@/lib/excel-utils";
import { orderExportColumns, flattenOrdersForExport } from "@/lib/order-import-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ALL_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmée" },
  { value: "processing", label: "En préparation" },
  { value: "shipped", label: "Expédiée" },
  { value: "delivered", label: "Livrée" },
  { value: "cancelled", label: "Annulée" },
  { value: "refunded", label: "Remboursée" },
];

export function OrdersPage() {
  const { data: orders = [], isLoading, error } = useOrdersWithItems();
  const updateOrderStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const { toast } = useToast();
  const { canWrite, canDelete } = useAuth();
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<typeof orders[0] | null>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Handle status toggle
  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Clear all status filters
  const clearStatusFilters = () => {
    setSelectedStatuses([]);
  };

  // Filtrage
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        searchTerm === "" ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = selectedStatuses.length === 0 || 
        (order.status && selectedStatuses.includes(order.status));

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, selectedStatuses]);

  const pendingCount = orders.filter(o => o.status === "pending").length;
  const processingCount = orders.filter(o => o.status === "processing").length;
  const shippedCount = orders.filter(o => o.status === "shipped").length;
  const deliveredCount = orders.filter(o => o.status === "delivered").length;

  const handleRowClick = (order: typeof orders[0]) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedOrder(null);
  };

  const handleCreateNew = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleMarkAsPaid = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    setMarkingPaidId(orderId);
    try {
      await updateOrder.mutateAsync({
        id: orderId,
        payment_status: 'paid',
        paid_at: new Date().toISOString()
      });
      toast({ title: "Paiement confirmé", description: "La commande a été marquée comme payée." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le paiement.", variant: "destructive" });
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingOrder) return;
    try {
      await deleteOrder.mutateAsync(deletingOrder.id);
      toast({ title: "Succès", description: "Commande supprimée" });
      setDeletingOrder(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la commande", variant: "destructive" });
    }
  };

  // CSV Export function
  const exportToCSV = useCallback(() => {
    if (filteredOrders.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucune commande à exporter", variant: "destructive" });
      return;
    }

    const headers = ["Numéro", "Client", "Email", "Statut", "Paiement", "Articles", "Total", "Date"];
    const rows = filteredOrders.map(order => [
      order.order_number,
      `"${(order.customer_name || '').replace(/"/g, '""')}"`,
      order.customer_email,
      order.status || '',
      order.payment_status || '',
      (order.order_items?.length || 0).toString(),
      order.total.toString(),
      order.created_at || ''
    ].join(";"));

    const csvContent = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `commandes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Export réussi", description: `${filteredOrders.length} commande(s) exportée(s)` });
  }, [filteredOrders, toast]);

  // XLS Export function (Format A - one row per item)
  const handleExportXLS = useCallback(() => {
    if (filteredOrders.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucune commande à exporter", variant: "destructive" });
      return;
    }
    
    const flatData = flattenOrdersForExport(filteredOrders);
    exportToXLS(flatData, orderExportColumns, `commandes_${new Date().toISOString().split('T')[0]}`);
    toast({ title: "Export réussi", description: `${filteredOrders.length} commande(s) exportée(s) en XLS` });
  }, [filteredOrders, toast]);

  // Check if order can be deleted (only cancelled or refunded)
  const canDeleteOrder = (order: typeof orders[0]) => {
    return order.status === 'cancelled' || order.status === 'refunded';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center text-destructive">
        Erreur lors du chargement des commandes
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <ImportExportDropdowns
              onExportCSV={exportToCSV}
              onExportXLS={handleExportXLS}
              onImportXLS={() => setIsImportOpen(true)}
              canWrite={canWrite()}
              showHistory={false}
            />
            {canWrite() && (
              <Button className="gap-2" onClick={handleCreateNew}>
                <Plus className="w-4 h-4" />
                Nouvelle commande
              </Button>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap items-center">
            {/* Multi-select Status Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer flex items-center gap-2 hover:bg-secondary/80 transition-colors">
                  {selectedStatuses.length === 0 ? (
                    "Tous les statuts"
                  ) : selectedStatuses.length === 1 ? (
                    ALL_STATUSES.find(s => s.value === selectedStatuses[0])?.label
                  ) : (
                    `${selectedStatuses.length} statuts sélectionnés`
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-1">
                  {ALL_STATUSES.map(status => (
                    <label
                      key={status.value}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedStatuses.includes(status.value)}
                        onCheckedChange={() => toggleStatus(status.value)}
                      />
                      <span className="text-sm">{status.label}</span>
                    </label>
                  ))}
                </div>
                {selectedStatuses.length > 0 && (
                  <button
                    onClick={clearStatusFilters}
                    className="w-full mt-2 pt-2 border-t border-border text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Effacer les filtres
                  </button>
                )}
              </PopoverContent>
            </Popover>

            {/* Selected status badges */}
            {selectedStatuses.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {selectedStatuses.map(status => (
                  <span
                    key={status}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
                  >
                    {ALL_STATUSES.find(s => s.value === status)?.label}
                    <button
                      onClick={() => toggleStatus(status)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

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
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Paiement</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Articles</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Total</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Date</th>
                {canWrite() && (
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const itemsCount = order.order_items?.length || 0;
                const initials = order.customer_name 
                  ? order.customer_name.split(' ').map(n => n[0]).join('') 
                  : order.customer_email[0].toUpperCase();
                
                return (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(order)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-semibold text-primary">{order.order_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold text-primary">
                          {initials}
                        </div>
                        <div>
                          <div className="font-medium">{order.customer_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.status && (
                        <StatusBadge variant={orderStatusVariant[order.status]}>
                          {orderStatusLabel[order.status]}
                        </StatusBadge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {order.payment_status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                          <CheckCircle className="w-3 h-3" />
                          Payé
                        </span>
                      ) : order.payment_status === 'refunded' ? (
                        <span className="text-xs font-medium text-danger">Remboursé</span>
                      ) : (
                        <span className="text-xs font-medium text-warning">En attente</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{itemsCount} article{itemsCount > 1 ? 's' : ''}</td>
                    <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(order.total)}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{formatDateTime(order.created_at)}</td>
                    {canWrite() && (
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {order.payment_status !== 'paid' && order.payment_status !== 'refunded' && order.status !== 'cancelled' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={(e) => handleMarkAsPaid(e, order.id)}
                              disabled={markingPaidId === order.id}
                            >
                              {markingPaidId === order.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CreditCard className="w-3 h-3" />
                              )}
                              Payé
                            </Button>
                          )}
                          {canDelete() && canDeleteOrder(order) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  onClick={() => setDeletingOrder(order)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
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

      {/* Order Form Modal */}
      <OrderFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la commande "{deletingOrder?.order_number}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleteOrder.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteOrder.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Modal */}
      <OrderImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  );
}
