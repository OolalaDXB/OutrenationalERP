import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Tag, Disc, Loader2, Globe, Pencil, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { ImportExportModal } from "@/components/import-export/ImportExportModal";
import { useLabels, useDeleteLabel, type LabelWithSupplier } from "@/hooks/useLabels";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAllSupplierLabels } from "@/hooks/useSupplierLabels";
import { useAuth } from "@/hooks/useAuth";
import { LabelFormModal } from "@/components/forms/LabelFormModal";
import { LabelDrawer } from "@/components/drawers/LabelDrawer";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { exportToXLS, labelExportColumns } from "@/lib/excel-utils";
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

export function LabelsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: labels = [], isLoading, error } = useLabels();
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const { data: allSupplierLabels = [] } = useAllSupplierLabels();
  const { canWrite } = useAuth();
  const deleteLabel = useDeleteLabel();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<LabelWithSupplier | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<LabelWithSupplier | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<LabelWithSupplier | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Calculate products count per label
  const labelStats = useMemo(() => {
    const stats = new Map<string, number>();
    products.forEach(product => {
      if (product.label_id) {
        stats.set(product.label_id, (stats.get(product.label_id) || 0) + 1);
      } else if (product.label_name) {
        // Fallback to label_name if no label_id
        const matchingLabel = labels.find(l => 
          l.name.toLowerCase() === product.label_name?.toLowerCase()
        );
        if (matchingLabel) {
          stats.set(matchingLabel.id, (stats.get(matchingLabel.id) || 0) + 1);
        }
      }
    });
    return stats;
  }, [products, labels]);

  // Labels filtered by supplier
  const labelsForSupplier = useMemo(() => {
    if (supplierFilter === "all") return labels;
    const labelIdsForSupplier = allSupplierLabels
      .filter(sl => sl.supplier_id === supplierFilter)
      .map(sl => sl.label_id);
    return labels.filter(label => labelIdsForSupplier.includes(label.id));
  }, [labels, allSupplierLabels, supplierFilter]);

  const filteredLabels = useMemo(() => {
    if (!searchTerm) return labelsForSupplier;
    const term = searchTerm.toLowerCase();
    return labelsForSupplier.filter(label =>
      label.name.toLowerCase().includes(term) ||
      label.country?.toLowerCase().includes(term)
    );
  }, [labelsForSupplier, searchTerm]);

  const handleEdit = (label: LabelWithSupplier) => {
    setEditingLabel(label);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deletingLabel) {
      await deleteLabel.mutateAsync(deletingLabel.id);
      setDeletingLabel(null);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLabel(null);
  };

  const handleNavigateToProducts = (labelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/products?label=${labelId}`);
  };

  const handleCardClick = (label: LabelWithSupplier) => {
    setSelectedLabel(label);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLabel(null);
  };

  // CSV Export function
  const exportToCSV = useCallback(() => {
    if (filteredLabels.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucun label à exporter", variant: "destructive" });
      return;
    }

    const headers = ["Nom", "Pays", "Fournisseur", "Site Web", "Produits"];
    const rows = filteredLabels.map(label => [
      `"${(label.name || '').replace(/"/g, '""')}"`,
      label.country || '',
      `"${(label.suppliers?.name || '').replace(/"/g, '""')}"`,
      label.website || '',
      (labelStats.get(label.id) || 0).toString()
    ].join(";"));

    const csvContent = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `labels_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Export réussi", description: `${filteredLabels.length} label(s) exporté(s)` });
  }, [filteredLabels, labelStats, toast]);

  // XLS Export function
  const handleExportXLS = useCallback(() => {
    if (filteredLabels.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucun label à exporter", variant: "destructive" });
      return;
    }
    exportToXLS(
      filteredLabels as unknown as Record<string, unknown>[],
      labelExportColumns as { key: string; header: string }[],
      `labels_export_${new Date().toISOString().split('T')[0]}`
    );
    toast({ title: "Export réussi", description: `${filteredLabels.length} label(s) exporté(s)` });
  }, [filteredLabels, toast]);

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['labels'] });
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
        Erreur lors du chargement des labels
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les labels</h2>
          <p className="text-sm text-muted-foreground">
            {labels.length} label{labels.length > 1 ? 's' : ''} au catalogue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportDropdowns
            onExportCSV={exportToCSV}
            onExportXLS={handleExportXLS}
            onImportXLS={() => setIsImportExportOpen(true)}
            canWrite={canWrite()}
            entityType="labels"
          />
          {canWrite() && (
            <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4" />
              Ajouter un label
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="all">Tous les fournisseurs</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Input
            type="text"
            placeholder="Rechercher un label..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] max-w-[300px]"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
          {filteredLabels.map((label) => {
            const productsCount = labelStats.get(label.id) || 0;
            return (
              <div
                key={label.id}
                onClick={() => handleCardClick(label)}
                className="bg-secondary rounded-lg p-4 hover:shadow-md transition-shadow border border-transparent hover:border-primary/20 group cursor-pointer"
              >
                <div className="flex items-start gap-3 mb-3" onClick={(e) => e.stopPropagation()}>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{label.name}</div>
                    {label.suppliers && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {label.suppliers.name}
                      </div>
                    )}
                    {label.country && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Globe className="w-3 h-3" />
                        {label.country}
                      </div>
                    )}
                  </div>
                  {canWrite() && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(label)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingLabel(label)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleNavigateToProducts(label.id, e)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Disc className="w-3 h-3" />
                    <span className="hover:underline">{productsCount} produit{productsCount > 1 ? 's' : ''}</span>
                  </button>
                  {label.website && (
                    <a
                      href={label.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Site web
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredLabels.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Aucun label trouvé</p>
          </div>
        )}
      </div>

      <LabelFormModal 
        isOpen={isFormOpen} 
        onClose={handleCloseForm} 
        label={editingLabel}
      />

      <AlertDialog open={!!deletingLabel} onOpenChange={() => setDeletingLabel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce label ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le label "{deletingLabel?.name}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Label Drawer */}
      <LabelDrawer
        label={selectedLabel}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        entityType="labels"
        data={labels as unknown as Record<string, unknown>[]}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
