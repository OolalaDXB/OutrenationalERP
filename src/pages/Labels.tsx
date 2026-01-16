import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Tag, Disc, Loader2, Globe, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLabels, useDeleteLabel, Label } from "@/hooks/useLabels";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAllSupplierLabels } from "@/hooks/useSupplierLabels";
import { useAuth } from "@/hooks/useAuth";
import { LabelFormModal } from "@/components/forms/LabelFormModal";
import { LabelDrawer } from "@/components/drawers/LabelDrawer";
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
  const { data: labels = [], isLoading, error } = useLabels();
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const { data: allSupplierLabels = [] } = useAllSupplierLabels();
  const { canWrite } = useAuth();
  const deleteLabel = useDeleteLabel();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<Label | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null);
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

  const handleEdit = (label: Label) => {
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

  const handleCardClick = (label: Label) => {
    setSelectedLabel(label);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLabel(null);
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
        {canWrite() && (
          <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4" />
            Ajouter un label
          </Button>
        )}
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
    </div>
  );
}
