import { useState, useMemo } from "react";
import { Plus, MoreHorizontal, Loader2, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { SupplierDrawer } from "@/components/drawers/SupplierDrawer";
import { SupplierFormModal } from "@/components/forms/SupplierFormModal";
import { ImportExportModal } from "@/components/import-export/ImportExportModal";
import { useSuppliers, useDeleteSupplier, type Supplier } from "@/hooks/useSuppliers";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SuppliersPage() {
  const queryClient = useQueryClient();
  const { data: suppliers = [], isLoading, error } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const { toast } = useToast();
  const { canWrite, canDelete } = useAuth();
  
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);

  // Pays uniques
  const countries = useMemo(() => {
    const unique = new Set(suppliers.map((s) => s.country).filter(Boolean));
    return Array.from(unique).sort() as string[];
  }, [suppliers]);

  // Filtrage
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch =
        searchTerm === "" ||
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === "all" || supplier.type === typeFilter;
      const matchesCountry = countryFilter === "all" || supplier.country === countryFilter;

      return matchesSearch && matchesType && matchesCountry;
    });
  }, [suppliers, searchTerm, typeFilter, countryFilter]);

  const handleRowClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedSupplier(null);
  };

  const handleCreateNew = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async (supplier: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer "${supplier.name}" ?`)) return;
    try {
      await deleteSupplier.mutateAsync(supplier.id);
      toast({ title: "Succès", description: "Fournisseur supprimé" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le fournisseur", variant: "destructive" });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
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
        Erreur lors du chargement des fournisseurs
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les fournisseurs</h2>
          <p className="text-sm text-muted-foreground">{filteredSuppliers.length} fournisseurs</p>
        </div>
        <div className="flex gap-2">
          {canWrite() && (
            <Button variant="outline" className="gap-2" onClick={() => setShowImportExport(true)}>
              <FileSpreadsheet className="w-4 h-4" />
              Import / Export
            </Button>
          )}
          {canWrite() && (
            <Button className="gap-2" onClick={handleCreateNew}>
              <Plus className="w-4 h-4" />
              Nouveau fournisseur
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="depot_vente">Dépôt-vente</option>
            <option value="consignment">Consignation</option>
            <option value="purchase">Achat ferme</option>
            <option value="own">Propre</option>
          </select>
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
          >
            <option value="all">Tous les pays</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Rechercher fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Fournisseur</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Commission</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Références</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">CA Total</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">À reverser</th>
              {canWrite() && (
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((supplier) => (
              <tr
                key={supplier.id}
                className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(supplier)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                      {supplier.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-primary">{supplier.name}</div>
                      <div className="text-xs text-muted-foreground">{supplier.country || '—'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge variant={supplierTypeVariant[supplier.type]}>
                    {supplierTypeLabel[supplier.type]}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm tabular-nums">
                    {(supplier.type === "consignment" || supplier.type === "depot_vente") && supplier.commission_rate 
                      ? `${(supplier.commission_rate * 100).toFixed(0)}%` 
                      : "—"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm tabular-nums">{supplier.products_count || 0}</td>
                <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(supplier.total_revenue)}</td>
                <td className="px-6 py-4">
                  <span className={`tabular-nums ${(supplier.pending_payout || 0) > 0 ? "text-info font-semibold" : "text-muted-foreground"}`}>
                    {(supplier.pending_payout || 0) > 0 ? formatCurrency(supplier.pending_payout) : "—"}
                  </span>
                </td>
                {canWrite() && (
                  <td className="px-6 py-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => handleEdit(supplier, e as unknown as React.MouseEvent)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        {canDelete() && (
                          <DropdownMenuItem 
                            onClick={(e) => handleDelete(supplier, e as unknown as React.MouseEvent)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSuppliers.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            Aucun fournisseur trouvé
          </div>
        )}
      </div>

      {/* Supplier Drawer */}
      <SupplierDrawer
        supplier={selectedSupplier}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />

      {/* Supplier Form Modal */}
      <SupplierFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        supplier={editingSupplier}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        entityType="suppliers"
        data={suppliers as unknown as Record<string, unknown>[]}
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['suppliers'] })}
      />
    </div>
  );
}
