import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ShoppingCart, Package, Truck, CheckCircle, Plus, Loader2, X, MoreHorizontal, Trash2, History, RotateCcw, Building2, Globe, User, ShoppingBag } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge, orderStatusVariant, orderStatusLabel, paymentStatusVariant, paymentStatusLabel } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { TablePagination } from "@/components/ui/table-pagination";
import { OrderDrawer } from "@/components/drawers/OrderDrawer";
import { OrderFormModal } from "@/components/forms/OrderFormModal";
import { OrderImportModal } from "@/components/orders/OrderImportModal";
import { OrderImportHistoryModal } from "@/components/orders/OrderImportHistoryModal";
import { 
  usePaginatedOrdersWithItems, 
  useOrdersWithItems, 
  useUpdateOrderStatus, 
  useCancelOrder, 
  useUpdateOrder, 
  useDeleteOrder,
  useDeletedOrders,
  useRestoreOrder,
  usePermanentDeleteOrder
} from "@/hooks/useOrders";
import { useSalesChannels } from "@/hooks/useSalesChannels";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Sales channel filter options
const SALES_CHANNEL_FILTERS = [
  { value: "", label: "Tous les canaux", icon: null },
  { value: "pro_portal", label: "Portail Pro", icon: Building2 },
  { value: "web", label: "Site Web", icon: Globe },
  { value: "website", label: "Site Web", icon: Globe },
  { value: "manual", label: "Saisie manuelle", icon: User },
  { value: "discogs", label: "Discogs", icon: ShoppingBag },
  { value: "ebay", label: "eBay", icon: ShoppingBag },
];

const ALL_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmée" },
  { value: "processing", label: "En préparation" },
  { value: "shipped", label: "Expédiée" },
  { value: "delivered", label: "Livrée" },
  { value: "cancelled", label: "Annulée" },
  { value: "refunded", label: "Remboursée" },
];

const PAGE_SIZE = 50;

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  
  const { data: paginatedData, isLoading, isFetching, isPlaceholderData, error } = usePaginatedOrdersWithItems({ page: currentPage, pageSize: PAGE_SIZE });
  const { data: allOrders = [] } = useOrdersWithItems();
  const { data: deletedOrders = [], isLoading: deletedLoading } = useDeletedOrders();
  
  const orders = paginatedData?.data || [];
  const totalCount = paginatedData?.count || 0;
  
  const { enabledChannels } = useSalesChannels();
  const updateOrderStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const updateOrder = useUpdateOrder();
  const deleteOrder = useDeleteOrder();
  const restoreOrder = useRestoreOrder();
  const permanentDeleteOrder = usePermanentDeleteOrder();
  const { toast } = useToast();
  const { canWrite, canDelete, hasRole } = useAuth();
  
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  
  // Confirmation dialogs
  const [softDeleteDialog, setSoftDeleteDialog] = useState<typeof orders[0] | null>(null);
  const [restoreDialog, setRestoreDialog] = useState<typeof orders[0] | null>(null);
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<typeof orders[0] | null>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<typeof orders[0] | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (newPage === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', newPage.toString());
    }
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showLoadingState = isFetching && isPlaceholderData;

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

      // Match by sales channel (source field)
      const matchesChannel = selectedChannel === "" ||
        (order.source && order.source.toLowerCase() === selectedChannel.toLowerCase());

      return matchesSearch && matchesStatus && matchesChannel;
    });
  }, [orders, searchTerm, selectedStatuses, selectedChannel]);

  // Filter deleted orders
  const filteredDeletedOrders = useMemo(() => {
    return deletedOrders.filter((order) => {
      const matchesSearch =
        searchTerm === "" ||
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order.customer_email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [deletedOrders, searchTerm]);

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

  const handleSoftDelete = async () => {
    if (!softDeleteDialog) return;
    try {
      await deleteOrder.mutateAsync(softDeleteDialog.id);
      toast({ title: "Succès", description: "Commande archivée" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'archiver la commande", variant: "destructive" });
    } finally {
      setSoftDeleteDialog(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog) return;
    try {
      await restoreOrder.mutateAsync(restoreDialog.id);
      toast({ title: "Succès", description: "Commande restaurée" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de restaurer la commande", variant: "destructive" });
    } finally {
      setRestoreDialog(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteDialog) return;
    try {
      await permanentDeleteOrder.mutateAsync(permanentDeleteDialog.id);
      toast({ title: "Succès", description: "Commande supprimée définitivement" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la commande", variant: "destructive" });
    } finally {
      setPermanentDeleteDialog(null);
    }
  };

  // Check if order can be deleted (only cancelled or refunded)
  const canDeleteOrder = (order: typeof orders[0]) => {
    return order.status === 'cancelled' || order.status === 'refunded';
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

  const trashCount = deletedOrders.length;

  return (
    <div className="space-y-6">
      {/* KPI Cards - only show in active view */}
      {viewMode === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard icon={ShoppingCart} value={pendingCount.toString()} label="En attente" variant="warning" />
          <KpiCard icon={Package} value={processingCount.toString()} label="En préparation" variant="info" />
          <KpiCard icon={Truck} value={shippedCount.toString()} label="Expédiées" variant="primary" />
          <KpiCard icon={CheckCircle} value={deliveredCount.toString()} label="Livrées" variant="success" />
        </div>
      )}

      {/* Filters & Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {viewMode === 'active' ? 'Toutes les commandes' : 'Corbeille'}
          </h2>
          <div className="flex items-center gap-2">
            {viewMode === 'active' && (
              <>
                <ImportExportDropdowns
                  onExportCSV={exportToCSV}
                  onExportXLS={handleExportXLS}
                  onImportXLS={() => setIsImportOpen(true)}
                  canWrite={canWrite()}
                  showHistory={false}
                />
                <Button variant="outline" size="icon" onClick={() => setIsHistoryOpen(true)} title="Historique des imports">
                  <History className="w-4 h-4" />
                </Button>
                {canWrite() && (
                  <Button className="gap-2" onClick={handleCreateNew}>
                    <Plus className="w-4 h-4" />
                    Nouvelle commande
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* View Mode Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'active' | 'trash')} className="mb-4">
          <TabsList>
            <TabsTrigger value="active">Commandes actives</TabsTrigger>
            <TabsTrigger value="trash" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Corbeille
              {trashCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {trashCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap items-center">
            {viewMode === 'active' && (
              <>
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

                {/* Sales Channel Filter */}
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="px-3 py-2 rounded-md border border-border bg-card text-sm"
                >
                  {SALES_CHANNEL_FILTERS.map(channel => (
                    <option key={channel.value} value={channel.value}>
                      {channel.label}
                    </option>
                  ))}
                </select>

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
              </>
            )}

            <input
              type="text"
              placeholder="Rechercher client, commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
            />
          </div>

          {/* Active Orders Table */}
          {viewMode === 'active' && (
            <>
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
                          <div className="flex items-center gap-1.5">
                            {order.source === "pro_portal" && (
                              <Badge variant="outline" className="bg-violet-100 text-violet-700 border-violet-300 text-[10px] px-1.5 py-0 font-semibold">
                                PRO
                              </Badge>
                            )}
                            {order.status && (
                              <StatusBadge variant={orderStatusVariant[order.status]}>
                                {orderStatusLabel[order.status]}
                              </StatusBadge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {order.payment_status && (
                            <StatusBadge variant={paymentStatusVariant[order.payment_status]}>
                              {paymentStatusLabel[order.payment_status]}
                            </StatusBadge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{itemsCount} article{itemsCount > 1 ? 's' : ''}</td>
                        <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(order.total)}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{formatDateTime(order.created_at)}</td>
                        {canWrite() && (
                          <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2">
                              {canDelete() && canDeleteOrder(order) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem 
                                      onClick={() => setSoftDeleteDialog(order)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Archiver
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

              {/* Pagination */}
              <TablePagination
                page={currentPage}
                totalCount={totalCount}
                pageSize={PAGE_SIZE}
                onPageChange={handlePageChange}
                isLoading={showLoadingState}
              />
            </>
          )}

          {/* Trash View */}
          {viewMode === 'trash' && (
            <>
              {deletedLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Commande</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Client</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Total</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Archivé le</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeletedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="font-semibold text-muted-foreground">{order.order_number}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-muted-foreground">{order.customer_name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold tabular-nums text-muted-foreground">{formatCurrency(order.total)}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {order.deleted_at && format(new Date(order.deleted_at), "d MMM yyyy à HH:mm", { locale: fr })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRestoreDialog(order)}
                              className="gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              Restaurer
                            </Button>
                            {hasRole('admin') && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setPermanentDeleteDialog(order)}
                              >
                                Supprimer définitivement
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {filteredDeletedOrders.length === 0 && !deletedLoading && (
                <div className="p-12 text-center text-muted-foreground">
                  La corbeille est vide
                </div>
              )}
            </>
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

      {/* Soft Delete Confirmation Dialog */}
      <AlertDialog open={!!softDeleteDialog} onOpenChange={() => setSoftDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir archiver la commande "{softDeleteDialog?.order_number}" ? La commande sera déplacée dans la corbeille et pourra être restaurée ultérieurement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDelete}>Archiver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreDialog} onOpenChange={() => setRestoreDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurer cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurer la commande "{restoreDialog?.order_number}" ? La commande sera de nouveau disponible dans la liste des commandes actives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restaurer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!permanentDeleteDialog} onOpenChange={() => setPermanentDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Suppression définitive</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La commande "{permanentDeleteDialog?.order_number}" et tous ses articles seront définitivement supprimés et ne pourront plus être récupérés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Modal */}
      <OrderImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />

      {/* Import History Modal */}
      <OrderImportHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
