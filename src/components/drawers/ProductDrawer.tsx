import { useState } from "react";
import { X, Disc3, MapPin, Tag, Package, Euro, TrendingUp, Pencil, Trash2, ExternalLink, Plus, Minus, History, Loader2, Building2, ChevronRight, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { StockIndicator } from "@/components/ui/stock-indicator";
import { ProductImageGalleryViewer } from "@/components/ui/product-image-gallery-viewer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Product } from "@/hooks/useProducts";
import { useDeleteProduct } from "@/hooks/useProducts";
import { useStockMovements, useAdjustStock } from "@/hooks/useStockMovements";
import { useSupplier } from "@/hooks/useSuppliers";
import { useArtist } from "@/hooks/useArtists";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { ProductFormModal } from "@/components/forms/ProductFormModal";
import { SupplierDrawer } from "@/components/drawers/SupplierDrawer";
import { ArtistDrawer } from "@/components/drawers/ArtistDrawer";

interface ProductDrawerProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatLabels: Record<string, string> = {
  lp: "LP",
  "2lp": "2×LP",
  "3lp": "3×LP",
  cd: "CD",
  boxset: "Box Set",
  "7inch": '7"',
  "10inch": '10"',
  "12inch": '12"',
  cassette: "K7",
  digital: "Digital",
};

const conditionLabels: Record<string, string> = {
  M: "Mint",
  NM: "Near Mint",
  "VG+": "Very Good Plus",
  VG: "Very Good",
  "G+": "Good Plus",
  G: "Good",
  F: "Fair",
  P: "Poor",
};

const statusVariant: Record<string, "success" | "warning" | "info"> = {
  published: "success",
  draft: "warning",
  archived: "info",
};

const statusLabels: Record<string, string> = {
  published: "Publié",
  draft: "Brouillon",
  archived: "Archivé",
};

const movementTypeLabels: Record<string, string> = {
  purchase: "Achat",
  sale: "Vente",
  return: "Retour",
  adjustment: "Ajustement",
  loss: "Perte",
  consignment_in: "Dépôt entrant",
  consignment_out: "Dépôt sortant",
};

const movementTypeColors: Record<string, string> = {
  purchase: "text-success",
  sale: "text-danger",
  return: "text-info",
  adjustment: "text-warning",
  loss: "text-danger",
  consignment_in: "text-success",
  consignment_out: "text-danger",
};

export function ProductDrawer({ product, isOpen, onClose }: ProductDrawerProps) {
  const { canWrite, canDelete } = useAuth();
  const deleteProduct = useDeleteProduct();
  const adjustStock = useAdjustStock();
  const { data: stockMovements = [], isLoading: movementsLoading } = useStockMovements(product?.id);
  const { data: supplier } = useSupplier(product?.supplier_id || '');
  const { data: artist } = useArtist(product?.artist_id || '');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSupplierDrawer, setShowSupplierDrawer] = useState(false);
  const [showArtistDrawer, setShowArtistDrawer] = useState(false);

  const handleDelete = async () => {
    if (!product) return;
    try {
      await deleteProduct.mutateAsync(product.id);
      toast({ title: "Produit supprimé", description: `${product.title} a été supprimé.` });
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le produit.", variant: "destructive" });
    }
  };

  const handleStockAdjust = async (delta: number) => {
    if (!product) return;
    try {
      await adjustStock.mutateAsync({
        productId: product.id,
        quantity: delta,
        type: "adjustment",
        reason: delta > 0 ? "Ajustement manuel (+)" : "Ajustement manuel (-)"
      });
      toast({ 
        title: "Stock mis à jour", 
        description: `Stock ${delta > 0 ? 'augmenté' : 'diminué'} de ${Math.abs(delta)} unité(s)` 
      });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le stock.", variant: "destructive" });
    }
  };

  if (!isOpen || !product) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border z-10">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Disc3 className="w-6 h-6 text-muted-foreground/50" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold line-clamp-1">{product.title}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {product.artist_name ? (
                    <button 
                      onClick={() => setShowArtistDrawer(true)}
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <Music className="w-3 h-3" />
                      {product.artist_name}
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Artiste inconnu</span>
                  )}
                  {product.status && (
                    <StatusBadge variant={statusVariant[product.status] || "info"}>
                      {statusLabels[product.status] || product.status}
                    </StatusBadge>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Image Gallery */}
            {(product.image_url || (product.image_urls && product.image_urls.length > 0)) && (
              <ProductImageGalleryViewer
                images={product.image_urls || []}
                mainImage={product.image_url}
                title={product.title}
              />
            )}

            {/* Product Info */}
            <div className="bg-secondary rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">SKU:</span>
                <span className="font-mono">{product.sku}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Disc3 className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Format:</span>
                <span>{formatLabels[product.format] || product.format.toUpperCase()}</span>
              </div>
              {product.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Emplacement:</span>
                  <span>{product.location}</span>
                </div>
              )}
              {product.label_name && (
                <div className="flex items-center gap-3 text-sm">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Label:</span>
                  <span>{product.label_name}</span>
                </div>
              )}
              {product.catalog_number && (
                <div className="flex items-center gap-3 text-sm">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Catalogue:</span>
                  <span className="font-mono">{product.catalog_number}</span>
                </div>
              )}
            </div>

            {/* Condition & Year */}
            {(product.condition_media || product.condition_sleeve || product.year_released) && (
              <div>
                <h3 className="text-sm font-semibold mb-3">État & Année</h3>
                <div className="bg-secondary rounded-lg p-4 grid grid-cols-3 gap-4">
                  {product.condition_media && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Vinyle</div>
                      <div className="font-medium">{product.condition_media} - {conditionLabels[product.condition_media] || ""}</div>
                    </div>
                  )}
                  {product.condition_sleeve && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Pochette</div>
                      <div className="font-medium">{product.condition_sleeve} - {conditionLabels[product.condition_sleeve] || ""}</div>
                    </div>
                  )}
                  {product.year_released && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Année</div>
                      <div className="font-medium">{product.year_released}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Prix
              </h3>
              <div className="bg-secondary rounded-lg p-4 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Prix de vente</div>
                  <div className="text-xl font-bold text-primary">{formatCurrency(product.selling_price)}</div>
                </div>
                {product.cost_price && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Prix d'achat</div>
                    <div className="font-medium">{formatCurrency(product.cost_price)}</div>
                  </div>
                )}
                {product.compare_at_price && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Ancien prix</div>
                    <div className="font-medium line-through text-muted-foreground">{formatCurrency(product.compare_at_price)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Stock with Quick Adjust */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Stock
              </h3>
              <div className="bg-secondary rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Quantité en stock</div>
                    <div className="text-2xl font-bold">{product.stock ?? 0}</div>
                  </div>
                  <StockIndicator current={product.stock ?? 0} threshold={product.stock_threshold ?? 5} />
                </div>
                {product.stock_threshold && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Seuil d'alerte: {product.stock_threshold} unités
                  </div>
                )}
                
                {/* Quick Stock Adjustment */}
                {canWrite() && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-2">Ajustement rapide</div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleStockAdjust(-1)}
                        disabled={adjustStock.isPending || (product.stock ?? 0) <= 0}
                        className="gap-1"
                      >
                        <Minus className="w-3 h-3" />
                        1
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleStockAdjust(1)}
                        disabled={adjustStock.isPending}
                        className="gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        1
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleStockAdjust(-5)}
                        disabled={adjustStock.isPending || (product.stock ?? 0) < 5}
                        className="gap-1"
                      >
                        <Minus className="w-3 h-3" />
                        5
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleStockAdjust(5)}
                        disabled={adjustStock.isPending}
                        className="gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        5
                      </Button>
                      {adjustStock.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stock Movement History */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <History className="w-4 h-4" />
                Historique des mouvements
              </h3>
              <div className="bg-secondary rounded-lg overflow-hidden">
                {movementsLoading ? (
                  <div className="p-4 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : stockMovements.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Aucun mouvement de stock
                  </div>
                ) : (
                  <div className="divide-y divide-border max-h-48 overflow-y-auto">
                    {stockMovements.slice(0, 10).map((movement) => (
                      <div key={movement.id} className="p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">
                            {movementTypeLabels[movement.type] || movement.type}
                          </div>
                          {movement.reason && (
                            <div className="text-xs text-muted-foreground">{movement.reason}</div>
                          )}
                          <div className="text-xs text-muted-foreground">{formatDateTime(movement.created_at)}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${movementTypeColors[movement.type] || ''}`}>
                            {movement.type === 'sale' || movement.type === 'loss' || movement.type === 'consignment_out' 
                              ? `-${movement.quantity}` 
                              : `+${movement.quantity}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {movement.stock_before} → {movement.stock_after}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Supplier */}
            {product.supplier_name && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Fournisseur
                </h3>
                <button 
                  onClick={() => setShowSupplierDrawer(true)}
                  className="w-full bg-secondary rounded-lg p-4 flex items-center justify-between hover:bg-secondary/80 transition-colors cursor-pointer text-left"
                >
                  <div>
                    <div className="font-medium">{product.supplier_name}</div>
                    {product.supplier_type && (
                      <div className="text-xs text-muted-foreground capitalize">{product.supplier_type}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {product.consignment_rate && product.supplier_type === "consignment" && (
                      <div className="text-right mr-2">
                        <div className="text-xs text-muted-foreground">Commission</div>
                        <div className="font-medium">{(product.consignment_rate * 100).toFixed(0)}%</div>
                      </div>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              </div>
            )}

            {/* Performance */}
            {(product.total_sold || product.total_revenue) && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Performance
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-secondary rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{product.total_sold || 0}</div>
                    <div className="text-xs text-muted-foreground">Vendus</div>
                  </div>
                  <div className="bg-secondary rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{formatCurrency(product.total_revenue)}</div>
                    <div className="text-xs text-muted-foreground">CA Total</div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-sm font-semibold mb-3">Description</h3>
                <div className="bg-secondary rounded-lg p-4 text-sm">
                  {product.description}
                </div>
              </div>
            )}

            {/* Discogs Link */}
            {product.discogs_url && (
              <div>
                <a 
                  href={product.discogs_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Voir sur Discogs
                </a>
              </div>
            )}

            {/* Dates */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Créé le {formatDate(product.created_at)}</div>
              {product.updated_at && product.updated_at !== product.created_at && (
                <div>Modifié le {formatDate(product.updated_at)}</div>
              )}
            </div>

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
      <ProductFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        product={product}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le produit "{product.title}" sera définitivement supprimé.
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

      {/* Supplier Drawer */}
      <SupplierDrawer
        supplier={supplier || null}
        isOpen={showSupplierDrawer}
        onClose={() => setShowSupplierDrawer(false)}
      />

      {/* Artist Drawer */}
      <ArtistDrawer
        artist={artist || null}
        isOpen={showArtistDrawer}
        onClose={() => setShowArtistDrawer(false)}
      />
    </>
  );
}
