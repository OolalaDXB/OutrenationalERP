import { useState } from "react";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBulkAdjustStock } from "@/hooks/useStockMovements";
import { toast } from "@/hooks/use-toast";
import type { Product } from "@/hooks/useProducts";

interface BulkStockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  onSuccess: () => void;
}

const ADJUSTMENT_TYPES = [
  { value: "purchase", label: "Achat / Réception" },
  { value: "adjustment", label: "Ajustement inventaire" },
  { value: "return", label: "Retour" },
  { value: "loss", label: "Perte / Casse" },
  { value: "consignment_in", label: "Consignation entrée" },
  { value: "consignment_out", label: "Consignation sortie" },
] as const;

export function BulkStockAdjustmentModal({ 
  isOpen, 
  onClose, 
  selectedProducts,
  onSuccess 
}: BulkStockAdjustmentModalProps) {
  const [quantity, setQuantity] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<string>("adjustment");
  const [reason, setReason] = useState("");
  const bulkAdjust = useBulkAdjustStock();

  const handleSubmit = async () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty === 0) {
      toast({ title: "Erreur", description: "Veuillez entrer une quantité valide", variant: "destructive" });
      return;
    }

    try {
      await bulkAdjust.mutateAsync({
        productIds: selectedProducts.map(p => p.id),
        quantity: qty,
        type: adjustmentType as any,
        reason: reason || undefined
      });

      toast({ 
        title: "Stock ajusté", 
        description: `${selectedProducts.length} produit(s) mis à jour avec ${qty > 0 ? '+' : ''}${qty} unité(s)` 
      });
      
      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'ajuster le stock", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setQuantity("");
    setAdjustmentType("adjustment");
    setReason("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Ajustement de stock en masse
          </DialogTitle>
          <DialogDescription>
            Modifier le stock de {selectedProducts.length} produit(s) sélectionné(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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

          {/* Adjustment type */}
          <div className="space-y-2">
            <Label>Type d'ajustement</Label>
            <Select value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantité (+ pour ajouter, - pour retirer)</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex: +5 ou -3"
            />
            <p className="text-xs text-muted-foreground">
              Entrez un nombre positif pour ajouter au stock, négatif pour retirer
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Raison (optionnel)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Inventaire mensuel, Réception commande #123..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={bulkAdjust.isPending || !quantity}>
            {bulkAdjust.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Appliquer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
