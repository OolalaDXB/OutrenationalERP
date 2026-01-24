import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Plus, Loader2, Truck, CheckCircle, Clock } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePurchaseOrders, poStatusConfig, POStatus } from "@/hooks/usePurchaseOrders";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCapability } from "@/hooks/useCapability";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import { formatCurrency, formatDate } from "@/lib/format";

const PAGE_SIZE = 25;

const ALL_STATUSES: { value: POStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyée" },
  { value: "acknowledged", label: "Confirmée" },
  { value: "partially_received", label: "Partielle" },
  { value: "received", label: "Réceptionnée" },
  { value: "closed", label: "Clôturée" },
  { value: "cancelled", label: "Annulée" },
];

export function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { data: purchaseOrders = [], isLoading, error } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const { isEnabled, isLoading: capLoading } = useCapability();
  
  const canCreatePO = isEnabled('purchase_orders');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Filter orders
  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      searchTerm === "" ||
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === "" || po.status === selectedStatus;
    const matchesSupplier = selectedSupplier === "" || po.supplier_id === selectedSupplier;

    return matchesSearch && matchesStatus && matchesSupplier;
  });

  // Paginate
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // KPIs
  const draftCount = purchaseOrders.filter(po => po.status === 'draft').length;
  const sentCount = purchaseOrders.filter(po => po.status === 'sent').length;
  const inProgressCount = purchaseOrders.filter(po => 
    ['acknowledged', 'partially_received'].includes(po.status)
  ).length;
  const completedCount = purchaseOrders.filter(po => 
    ['received', 'closed'].includes(po.status)
  ).length;

  const handleRowClick = (poId: string) => {
    navigate(`/purchase-orders/${poId}`);
  };

  const handleCreateNew = () => {
    if (!canCreatePO) {
      setShowUpgradePrompt(true);
      return;
    }
    navigate("/purchase-orders/new");
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
        Erreur lors du chargement des commandes fournisseurs
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard icon={Clock} value={draftCount.toString()} label="Brouillons" variant="primary" />
        <KpiCard icon={Truck} value={sentCount.toString()} label="Envoyées" variant="info" />
        <KpiCard icon={Package} value={inProgressCount.toString()} label="En cours" variant="warning" />
        <KpiCard icon={CheckCircle} value={completedCount.toString()} label="Terminées" variant="success" />
      </div>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        capability="purchase_orders"
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />

      {/* Table Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Commandes fournisseurs</h2>
          <Button 
            className="gap-2" 
            onClick={handleCreateNew}
            disabled={capLoading}
          >
            <Plus className="w-4 h-4" />
            Nouvelle commande
          </Button>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap items-center">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-md border border-border bg-card text-sm"
            >
              <option value="">Tous les statuts</option>
              {ALL_STATUSES.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <select
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-md border border-border bg-card text-sm"
            >
              <option value="">Tous les fournisseurs</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-md border border-border bg-card text-sm"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left py-3 px-4 font-semibold">N° Commande</th>
                  <th className="text-left py-3 px-4 font-semibold">Fournisseur</th>
                  <th className="text-left py-3 px-4 font-semibold">Statut</th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                  <th className="text-left py-3 px-4 font-semibold">Date</th>
                  <th className="text-left py-3 px-4 font-semibold">Livraison prévue</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      Aucune commande fournisseur trouvée
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((po) => {
                    const statusConfig = poStatusConfig[po.status];
                    return (
                      <tr
                        key={po.id}
                        onClick={() => handleRowClick(po.id)}
                        className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-medium">{po.po_number}</td>
                        <td className="py-3 px-4">{po.suppliers?.name || '—'}</td>
                        <td className="py-3 px-4">
                          <StatusBadge variant={statusConfig.variant}>
                            {statusConfig.label}
                          </StatusBadge>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(po.total || 0, po.currency || 'EUR')}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {formatDate(po.created_at)}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {po.expected_date ? formatDate(po.expected_date) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredOrders.length > PAGE_SIZE && (
            <TablePagination
              page={currentPage}
              pageSize={PAGE_SIZE}
              totalCount={filteredOrders.length}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
