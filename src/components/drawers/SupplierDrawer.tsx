import { useState, useMemo } from "react";
import { X, Building2, Mail, Phone, MapPin, Package, Euro, TrendingUp, Pencil, Trash2, Disc, ChevronRight, Globe, FileText, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Supplier } from "@/hooks/useSuppliers";
import { useDeleteSupplier } from "@/hooks/useSuppliers";
import { useProducts, Product } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { SupplierFormModal } from "@/components/forms/SupplierFormModal";
import { ProductDrawer } from "@/components/drawers/ProductDrawer";
import { isValidVatNumberFormat } from "@/lib/vat-utils";
import { useSupplierLabels } from "@/hooks/useSupplierLabels";
import { useLabels } from "@/hooks/useLabels";
import { useAllOrderItems } from "@/hooks/useOrders";
import { MonthlySupplierReport } from "@/components/reports/MonthlySupplierReport";

interface SupplierDrawerProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SupplierDrawer({ supplier, isOpen, onClose }: SupplierDrawerProps) {
  const { canWrite, canDelete } = useAuth();
  const deleteSupplier = useDeleteSupplier();
  const { data: allProducts = [] } = useProducts();
  const { data: allLabels = [] } = useLabels();
  const { data: supplierLabelAssocs = [] } = useSupplierLabels(supplier?.id ?? null);
  const { data: allOrderItems = [] } = useAllOrderItems();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Labels associated with this supplier
  const associatedLabels = useMemo(() => {
    if (!supplierLabelAssocs.length) return [];
    return supplierLabelAssocs.map(assoc => 
      allLabels.find(l => l.id === assoc.label_id)
    ).filter(Boolean);
  }, [supplierLabelAssocs, allLabels]);

  // Products from this supplier
  const supplierProducts = useMemo(() => {
    if (!supplier) return [];
    return allProducts.filter((p) => p.supplier_id === supplier.id);
  }, [allProducts, supplier]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsProductDrawerOpen(true);
  };

  const handleDelete = async () => {
    if (!supplier) return;
    try {
      await deleteSupplier.mutateAsync(supplier.id);
      toast({ title: "Fournisseur supprimé", description: `${supplier.name} a été supprimé.` });
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le fournisseur.", variant: "destructive" });
    }
  };

  if (!isOpen || !supplier) return null;

  const hasValidVat = isValidVatNumberFormat((supplier as any).vat_number);

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-lg font-semibold text-primary">
                {supplier.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{supplier.name}</h2>
                <StatusBadge variant={supplierTypeVariant[supplier.type]}>
                  {supplierTypeLabel[supplier.type]}
                </StatusBadge>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div className="bg-secondary rounded-lg p-4 space-y-3">
              {supplier.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">{supplier.email}</a>
                </div>
              )}
              {supplier.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{supplier.phone}</span>
                </div>
              )}
              {(supplier.address || supplier.city || supplier.country) && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    {supplier.address && <div>{supplier.address}</div>}
                    <div>
                      {[
                        supplier.postal_code,
                        supplier.city,
                        (supplier as any).state,
                        supplier.country
                      ].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              )}
              {supplier.website && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={supplier.website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    {supplier.website}
                  </a>
                </div>
              )}
              {supplier.contact_name && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>Contact : {supplier.contact_name}</span>
                </div>
              )}
            </div>

            {/* TVA Info */}
            {(supplier as any).vat_number && (
              <div className="bg-muted rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Informations fiscales
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">TVA Intracommunautaire</div>
                    <div className="font-medium flex items-center gap-2">
                      {(supplier as any).vat_number}
                      {hasValidVat ? (
                        <span className="text-xs text-green-600">✓ Format valide</span>
                      ) : (
                        <span className="text-xs text-amber-600">⚠ Format invalide</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Contrat */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Contrat</h3>
              <div className="bg-secondary rounded-lg p-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Type</div>
                  <div className="font-medium">{supplierTypeLabel[supplier.type]}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Commission ON</div>
                  <div className="font-medium">
                    {supplier.type === "consignment" && supplier.commission_rate 
                      ? `${(supplier.commission_rate * 100).toFixed(0)}%` 
                      : "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Depuis</div>
                  <div className="font-medium">{formatDate(supplier.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Statut</div>
                  <div className="font-medium text-success">{supplier.active ? "Actif" : "Inactif"}</div>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Performance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold">{supplier.products_count || 0}</div>
                  <div className="text-xs text-muted-foreground">Références</div>
                </div>
                <div className="bg-secondary rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                    <Euro className="w-4 h-4" />
                  </div>
                  <div className="text-2xl font-bold">{formatCurrency(supplier.total_revenue)}</div>
                  <div className="text-xs text-muted-foreground">CA Total</div>
                </div>
              </div>
            </div>

            {/* À reverser */}
            {(supplier.pending_payout ?? 0) > 0 && (
              <div className="bg-info-light rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-info">À reverser</div>
                    <div className="text-xs text-info/70">Période en cours</div>
                  </div>
                  <div className="text-2xl font-bold text-info">{formatCurrency(supplier.pending_payout)}</div>
                </div>
              </div>
            )}

            {/* Associated Labels */}
            {associatedLabels.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Labels distribués ({associatedLabels.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {associatedLabels.map((label) => label && (
                    <span
                      key={label.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      <Tag className="w-3 h-3" />
                      {label.name}
                      {label.country && (
                        <span className="text-primary/60">({label.country})</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Products List */}
            {supplierProducts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Disc className="w-4 h-4" />
                  Produits ({supplierProducts.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {supplierProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="w-full flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-left"
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
                      <div className="text-right mr-2">
                        <div className="text-sm font-medium">{formatCurrency(product.selling_price)}</div>
                        <div className={`text-xs ${(product.stock || 0) > 0 ? 'text-success' : 'text-danger'}`}>
                          {product.stock || 0} en stock
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowReportModal(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Générer relevé
              </Button>
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
      <SupplierFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        supplier={supplier}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fournisseur "{supplier.name}" sera définitivement supprimé.
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

      {/* Product Drawer */}
      <ProductDrawer
        product={selectedProduct}
        isOpen={isProductDrawerOpen}
        onClose={() => setIsProductDrawerOpen(false)}
      />

      {/* Supplier Report Modal */}
      <MonthlySupplierReport
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        suppliers={[supplier]}
        orderItems={allOrderItems.filter(item => item.supplier_id === supplier.id) as any}
      />
    </>
  );
}
