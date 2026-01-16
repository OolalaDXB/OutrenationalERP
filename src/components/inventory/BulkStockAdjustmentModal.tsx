import { useState } from "react";
import { Package, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { Product } from "@/hooks/useProducts";

interface BulkStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  onSuccess: () => void;
}

/**
 * DEPRECATED: Direct stock adjustments are now forbidden.
 * Stock is managed automatically via order_items mutations.
 * This modal now shows an informational message instead.
 */
export function BulkStockAdjustmentModal({ 
  isOpen, 
  onClose, 
  selectedProducts,
  onSuccess 
}: BulkStockAdjustmentModalProps) {
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Ajustement de stock
          </DialogTitle>
          <DialogDescription>
            {selectedProducts.length} produit(s) sélectionné(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-sm">Ajustement manuel désactivé</p>
              <p className="text-sm text-muted-foreground">
                Le stock est désormais géré automatiquement via les commandes.
                Les modifications de stock se font uniquement via :
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Création d'une commande (décrémente le stock)</li>
                <li>Annulation d'un article (restaure le stock)</li>
                <li>Retour d'un article (restaure le stock)</li>
                <li>Modification de quantité (ajuste le stock)</li>
              </ul>
            </div>
          </div>

          {/* Selected products summary */}
          <div className="bg-secondary rounded-lg p-3 max-h-32 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-2">Produits sélectionnés :</p>
            <ul className="space-y-1">
              {selectedProducts.slice(0, 5).map(product => (
                <li key={product.id} className="text-sm truncate">
                  {product.title} <span className="text-muted-foreground">(stock: {product.stock ?? 0})</span>
                </li>
              ))}
              {selectedProducts.length > 5 && (
                <li className="text-sm text-muted-foreground">
                  ... et {selectedProducts.length - 5} autres
                </li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}