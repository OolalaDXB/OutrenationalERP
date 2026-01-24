import { useMemo, useState } from "react";
import { Loader2, Package, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreatePurchaseOrder } from "@/hooks/usePurchaseOrders";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import type { Supplier } from "@/hooks/useSuppliers";

interface ReorderSuggestion {
  product: {
    id: string;
    title: string;
    artist_name: string | null;
    sku: string;
    stock: number;
    stock_threshold: number;
    purchase_price: number | null;
    supplier_id: string;
  };
  supplier: Supplier;
  deficit: number;
  suggestedQty: number;
  estimatedCost: number;
  priority: "critical" | "high" | "medium";
}

interface SupplierGroup {
  supplier: Supplier;
  items: ReorderSuggestion[];
  totalCost: number;
}

interface MultiSupplierPOModalProps {
  open: boolean;
  onClose: () => void;
  selectedSuggestions: ReorderSuggestion[];
  onSuccess: () => void;
}

export function MultiSupplierPOModal({
  open,
  onClose,
  selectedSuggestions,
  onSuccess,
}: MultiSupplierPOModalProps) {
  const createPO = useCreatePurchaseOrder();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [createdPOs, setCreatedPOs] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Group by supplier
  const supplierGroups = useMemo(() => {
    const groups = new Map<string, SupplierGroup>();
    
    selectedSuggestions.forEach((s) => {
      const existing = groups.get(s.supplier.id);
      if (existing) {
        existing.items.push(s);
        existing.totalCost += s.estimatedCost;
      } else {
        groups.set(s.supplier.id, {
          supplier: s.supplier,
          items: [s],
          totalCost: s.estimatedCost,
        });
      }
    });

    return Array.from(groups.values());
  }, [selectedSuggestions]);

  const handleCreateAllPOs = async () => {
    setIsCreating(true);
    setCreatedPOs([]);
    setCurrentIndex(0);

    const created: string[] = [];
    let hasError = false;

    for (let i = 0; i < supplierGroups.length; i++) {
      setCurrentIndex(i);
      const group = supplierGroups[i];

      try {
        const poId = await createPO.mutateAsync({
          supplier_id: group.supplier.id,
          items: group.items.map((item) => ({
            product_id: item.product.id,
            sku: item.product.sku,
            title: item.product.artist_name
              ? `${item.product.artist_name} - ${item.product.title}`
              : item.product.title,
            quantity_ordered: item.suggestedQty,
            unit_cost: item.product.purchase_price || 0,
          })),
        });

        created.push(poId);
        setCreatedPOs([...created]);
      } catch (error) {
        hasError = true;
        const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
        toast({
          title: `Erreur pour ${group.supplier.name}`,
          description: errorMessage,
          variant: "destructive",
        });
      }
    }

    setIsCreating(false);

    if (created.length > 0) {
      toast({
        title: "Commandes créées",
        description: `${created.length} commande(s) fournisseur créée(s) avec succès`,
      });
      onSuccess();
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setCreatedPOs([]);
      setCurrentIndex(0);
      onClose();
    }
  };

  const totalProducts = selectedSuggestions.length;
  const totalCost = selectedSuggestions.reduce((sum, s) => sum + s.estimatedCost, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer {supplierGroups.length} commande(s) fournisseur</DialogTitle>
          <DialogDescription>
            Les produits sélectionnés proviennent de {supplierGroups.length} fournisseur(s) différent(s).
            Une commande sera créée pour chacun.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[300px] overflow-y-auto py-2">
          {supplierGroups.map((group, index) => {
            const isCreated = createdPOs.length > index;
            const isCurrent = isCreating && currentIndex === index && !isCreated;

            return (
              <div
                key={group.supplier.id}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {isCreated ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <Package className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium">{group.supplier.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {group.items.length} produit(s)
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(group.totalCost)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between py-2 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Total: {totalProducts} produits
          </div>
          <div className="font-semibold">{formatCurrency(totalCost)}</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Annuler
          </Button>
          <Button onClick={handleCreateAllPOs} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création en cours ({currentIndex + 1}/{supplierGroups.length})
              </>
            ) : (
              `Créer ${supplierGroups.length} commande(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
