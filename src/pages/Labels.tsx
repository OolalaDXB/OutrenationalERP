import { useState, useMemo } from "react";
import { Plus, Tag, Disc, Loader2, Globe, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLabels, useDeleteLabel, Label } from "@/hooks/useLabels";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { LabelFormModal } from "@/components/forms/LabelFormModal";
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
  const { data: labels = [], isLoading, error } = useLabels();
  const { data: products = [] } = useProducts();
  const { canWrite } = useAuth();
  const deleteLabel = useDeleteLabel();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<Label | null>(null);

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

  const filteredLabels = useMemo(() => {
    if (!searchTerm) return labels;
    const term = searchTerm.toLowerCase();
    return labels.filter(label =>
      label.name.toLowerCase().includes(term) ||
      label.country?.toLowerCase().includes(term)
    );
  }, [labels, searchTerm]);

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
                className="bg-secondary rounded-lg p-4 hover:shadow-md transition-shadow border border-transparent hover:border-primary/20 group"
              >
                <div className="flex items-start gap-3 mb-3">
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
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Disc className="w-3 h-3" />
                    <span>{productsCount} produit{productsCount > 1 ? 's' : ''}</span>
                  </div>
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
    </div>
  );
}
