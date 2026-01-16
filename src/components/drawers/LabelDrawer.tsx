import { useState, useMemo } from "react";
import { X, Tag, Globe, Disc, Building2, Pencil, Trash2, ExternalLink, ChevronRight, Euro, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDeleteLabel, Label } from "@/hooks/useLabels";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliersByLabel } from "@/hooks/useSupplierLabels";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/format";
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
import { toast } from "@/hooks/use-toast";

interface LabelDrawerProps {
  label: Label | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LabelDrawer({ label, isOpen, onClose }: LabelDrawerProps) {
  const navigate = useNavigate();
  const { canWrite, canDelete } = useAuth();
  const deleteLabel = useDeleteLabel();
  const { data: products = [] } = useProducts();
  const { data: supplierAssocs = [] } = useSuppliersByLabel(label?.id ?? null);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Products with this label
  const labelProducts = useMemo(() => {
    if (!label) return [];
    return products.filter((p) => p.label_id === label.id);
  }, [products, label]);

  // Statistics
  const stats = useMemo(() => {
    const totalStock = labelProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
    const totalValue = labelProducts.reduce((sum, p) => sum + (p.selling_price * (p.stock || 0)), 0);
    const totalSold = labelProducts.reduce((sum, p) => sum + (p.total_sold || 0), 0);
    const totalRevenue = labelProducts.reduce((sum, p) => sum + (p.total_revenue || 0), 0);
    
    return { totalStock, totalValue, totalSold, totalRevenue };
  }, [labelProducts]);

  // Associated suppliers
  const associatedSuppliers = useMemo(() => {
    return supplierAssocs.map(assoc => assoc.suppliers).filter(Boolean);
  }, [supplierAssocs]);

  const handleDelete = async () => {
    if (!label) return;
    try {
      await deleteLabel.mutateAsync(label.id);
      toast({ title: "Label supprimé", description: `${label.name} a été supprimé.` });
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le label.", variant: "destructive" });
    }
  };

  const handleNavigateToProducts = () => {
    if (label) {
      navigate(`/products?label=${label.id}`);
      onClose();
    }
  };

  if (!isOpen || !label) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Tag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{label.name}</h2>
                {label.country && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Globe className="w-3 h-3" />
                    {label.country}
                  </div>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Website */}
            {label.website && (
              <div className="bg-secondary rounded-lg p-4">
                <a
                  href={label.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {label.website}
                </a>
              </div>
            )}

            {/* Statistics */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Statistiques
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                    <Disc className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold">{labelProducts.length}</div>
                  <div className="text-xs text-muted-foreground">Références</div>
                </div>
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{stats.totalStock}</div>
                  <div className="text-xs text-muted-foreground">En stock</div>
                </div>
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                    <Euro className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                  <div className="text-xs text-muted-foreground">Valeur stock</div>
                </div>
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{stats.totalSold}</div>
                  <div className="text-xs text-muted-foreground">Vendus</div>
                </div>
              </div>
              {stats.totalRevenue > 0 && (
                <div className="mt-4 bg-primary/10 rounded-lg p-4 text-center">
                  <div className="text-sm text-muted-foreground">Chiffre d'affaires total</div>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</div>
                </div>
              )}
            </div>

            {/* Associated Suppliers */}
            {associatedSuppliers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Fournisseurs associés ({associatedSuppliers.length})
                </h3>
                <div className="space-y-2">
                  {associatedSuppliers.map((supplier: any) => supplier && (
                    <div
                      key={supplier.id}
                      className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {supplier.name?.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                      </div>
                      <span className="font-medium">{supplier.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Products */}
            {labelProducts.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Disc className="w-4 h-4" />
                    Produits récents
                  </h3>
                  <Button variant="ghost" size="sm" onClick={handleNavigateToProducts}>
                    Voir tout
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {labelProducts.slice(0, 5).map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
                    >
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center flex-shrink-0">
                          <Disc className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{product.title}</div>
                        <div className="text-xs text-muted-foreground">{product.artist_name || "—"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(product.selling_price)}</div>
                        <div className={`text-xs ${(product.stock || 0) > 0 ? 'text-success' : 'text-danger'}`}>
                          {product.stock || 0} en stock
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <Button variant="secondary" className="w-full" onClick={handleNavigateToProducts}>
              Voir tous les produits
            </Button>

            {/* Edit/Delete Actions */}
            {(canWrite() || canDelete()) && (
              <div className="flex gap-3 pt-4 border-t border-border">
                {canWrite() && (
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                )}
                {canDelete() && (
                  <Button variant="destructive" className="flex-1" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <LabelFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        label={label}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le label ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le label "{label.name}" sera définitivement supprimé.
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
    </>
  );
}
