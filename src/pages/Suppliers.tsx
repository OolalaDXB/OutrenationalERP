import { useState, useMemo, useCallback } from "react";
import { Plus, MoreHorizontal, Loader2, Pencil, Trash2, RotateCcw } from "lucide-react";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupplierDrawer } from "@/components/drawers/SupplierDrawer";
import { SupplierFormModal } from "@/components/forms/SupplierFormModal";
import { ImportExportModal } from "@/components/import-export/ImportExportModal";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { 
  useSuppliers, 
  useDeleteSupplier, 
  useDeletedSuppliers,
  useRestoreSupplier,
  usePermanentDeleteSupplier,
  type Supplier 
} from "@/hooks/useSuppliers";
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

export function SuppliersPage() {
  const queryClient = useQueryClient();
  const { data: suppliers = [], isLoading, error } = useSuppliers();
  const { data: deletedSuppliers = [], isLoading: deletedLoading } = useDeletedSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const restoreSupplier = useRestoreSupplier();
  const permanentDeleteSupplier = usePermanentDeleteSupplier();
  const { toast } = useToast();
  const { canWrite, canDelete, hasRole } = useAuth();
  
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  
  // Confirmation dialogs
  const [softDeleteDialog, setSoftDeleteDialog] = useState<Supplier | null>(null);
  const [restoreDialog, setRestoreDialog] = useState<Supplier | null>(null);
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<Supplier | null>(null);

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

  // Filtrage deleted suppliers
  const filteredDeletedSuppliers = useMemo(() => {
    return deletedSuppliers.filter((supplier) => {
      const matchesSearch =
        searchTerm === "" ||
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.email && supplier.email.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [deletedSuppliers, searchTerm]);

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

  const handleSoftDelete = async () => {
    if (!softDeleteDialog) return;
    try {
      await deleteSupplier.mutateAsync(softDeleteDialog.id);
      toast({ title: "Succès", description: "Fournisseur archivé" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'archiver le fournisseur", variant: "destructive" });
    } finally {
      setSoftDeleteDialog(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog) return;
    try {
      await restoreSupplier.mutateAsync(restoreDialog.id);
      toast({ title: "Succès", description: "Fournisseur restauré" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de restaurer le fournisseur", variant: "destructive" });
    } finally {
      setRestoreDialog(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteDialog) return;
    try {
      await permanentDeleteSupplier.mutateAsync(permanentDeleteDialog.id);
      toast({ title: "Succès", description: "Fournisseur supprimé définitivement" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le fournisseur", variant: "destructive" });
    } finally {
      setPermanentDeleteDialog(null);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  // CSV Export function
  const exportToCSV = useCallback(() => {
    if (filteredSuppliers.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucun fournisseur à exporter", variant: "destructive" });
      return;
    }

    const headers = ["Nom", "Type", "Email", "Téléphone", "Pays", "Commission", "Références", "CA Total"];
    const rows = filteredSuppliers.map(s => [
      `"${(s.name || '').replace(/"/g, '""')}"`,
      s.type || '',
      s.email || '',
      s.phone || '',
      s.country || '',
      s.commission_rate ? `${(s.commission_rate * 100).toFixed(0)}%` : '',
      (s.products_count || 0).toString(),
      (s.total_revenue || 0).toString()
    ].join(";"));

    const csvContent = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `fournisseurs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Export réussi", description: `${filteredSuppliers.length} fournisseur(s) exporté(s)` });
  }, [filteredSuppliers, toast]);

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

  const trashCount = deletedSuppliers.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {viewMode === 'active' ? 'Tous les fournisseurs' : 'Corbeille'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'active' ? `${filteredSuppliers.length} fournisseurs` : `${trashCount} fournisseur(s) archivé(s)`}
          </p>
        </div>
        <div className="flex gap-2">
          {viewMode === 'active' && (
            <>
              <ImportExportDropdowns
                onExportCSV={exportToCSV}
                onExportXLS={() => setShowImportExport(true)}
                onImportXLS={() => setShowImportExport(true)}
                canWrite={canWrite()}
                entityType="suppliers"
              />
              {canWrite() && (
                <Button className="gap-2" onClick={handleCreateNew}>
                  <Plus className="w-4 h-4" />
                  Nouveau fournisseur
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'active' | 'trash')}>
        <TabsList>
          <TabsTrigger value="active">Fournisseurs actifs</TabsTrigger>
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
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          {viewMode === 'active' && (
            <>
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
            </>
          )}
          <input
            type="text"
            placeholder="Rechercher fournisseur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>

        {/* Active Suppliers Table */}
        {viewMode === 'active' && (
          <>
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSoftDeleteDialog(supplier);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Archiver
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
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Fournisseur</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Type</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Archivé le</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeletedSuppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary opacity-60">
                            {supplier.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-muted-foreground">{supplier.name}</div>
                            <div className="text-xs text-muted-foreground">{supplier.country || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {supplierTypeLabel[supplier.type]}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {supplier.deleted_at && format(new Date(supplier.deleted_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoreDialog(supplier)}
                            className="gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restaurer
                          </Button>
                          {hasRole('admin') && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setPermanentDeleteDialog(supplier)}
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

            {filteredDeletedSuppliers.length === 0 && !deletedLoading && (
              <div className="p-12 text-center text-muted-foreground">
                La corbeille est vide
              </div>
            )}
          </>
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

      {/* Soft Delete Confirmation Dialog */}
      <AlertDialog open={!!softDeleteDialog} onOpenChange={() => setSoftDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir archiver "{softDeleteDialog?.name}" ? Le fournisseur sera déplacé dans la corbeille et pourra être restauré ultérieurement.
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
            <AlertDialogTitle>Restaurer ce fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurer "{restoreDialog?.name}" ? Le fournisseur sera de nouveau disponible dans la liste des fournisseurs actifs.
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
              Cette action est irréversible. Le fournisseur "{permanentDeleteDialog?.name}" sera définitivement supprimé et ne pourra plus être récupéré.
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
    </div>
  );
}
