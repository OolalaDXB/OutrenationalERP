import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Loader2, Search, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { useCreatePurchaseOrder } from "@/hooks/usePurchaseOrders";
import { useCapability } from "@/hooks/useCapability";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface POItem {
  id: string;
  product_id?: string;
  sku: string;
  title: string;
  quantity_ordered: number;
  unit_cost: number;
}

interface PurchaseOrderCreatePageProps {
  onNavigate: (path: string) => void;
}

// State passed from Reorder page
interface PrefilledState {
  supplierId?: string;
  items?: Array<{
    product_id: string;
    sku: string;
    title: string;
    quantity_ordered: number;
    unit_cost: number;
  }>;
}

export function PurchaseOrderCreatePage({ onNavigate }: PurchaseOrderCreatePageProps) {
  const location = useLocation();

  const readPrefill = (): PrefilledState | null => {
    // 1) react-router state (future-proof)
    const fromRouter = location.state as PrefilledState | null;
    if (fromRouter?.supplierId || fromRouter?.items?.length) return fromRouter;

    // 2) sessionStorage (used by backoffice internal navigation)
    try {
      const raw = sessionStorage.getItem('po-create-prefill');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PrefilledState;
      return parsed;
    } catch {
      return null;
    }
  };

  const prefilledState = readPrefill();

  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: products = [] } = useProducts();
  const createPO = useCreatePurchaseOrder();
  const { isEnabled } = useCapability();
  const { toast } = useToast();

  const canCreatePO = isEnabled('purchase_orders');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Form state
  const [step, setStep] = useState<1 | 2 | 3>(prefilledState?.supplierId ? 2 : 1);
  const [supplierId, setSupplierId] = useState(prefilledState?.supplierId || "");
  const [items, setItems] = useState<POItem[]>(() => {
    if (prefilledState?.items) {
      return prefilledState.items.map(item => ({
        id: crypto.randomUUID(),
        ...item,
      }));
    }
    return [];
  });
  const [shippingCost, setShippingCost] = useState(0);
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("EUR");

  // Clear the prefill payload after mount so refresh doesn't re-apply.
  useEffect(() => {
    // Defensive: ensure we never keep a stale pending mutation state when navigating internally
    // (the backoffice shell can re-render pages without changing the router location).
    createPO.reset();

    try {
      sessionStorage.removeItem('po-create-prefill');
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Product search
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Get selected supplier
  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  // Filter products by supplier AND search term
  const supplierProducts = products.filter(p => {
    // Must match supplier
    if (p.supplier_id !== supplierId) return false;
    
    // If no search term, show all products for this supplier
    if (searchTerm === "") return true;
    
    // Match search term against title, sku, or artist name
    const term = searchTerm.toLowerCase();
    return (
      p.title?.toLowerCase().includes(term) ||
      p.sku?.toLowerCase().includes(term) ||
      p.artist_name?.toLowerCase().includes(term)
    );
  });

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity_ordered * item.unit_cost), 0);
  const total = subtotal + shippingCost;

  const addItem = (product: typeof products[0]) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(items.map(i => 
        i.product_id === product.id 
          ? { ...i, quantity_ordered: i.quantity_ordered + 1 }
          : i
      ));
    } else {
      setItems([...items, {
        id: crypto.randomUUID(),
        product_id: product.id,
        sku: product.sku,
        title: `${product.artist_name ? product.artist_name + ' - ' : ''}${product.title}`,
        quantity_ordered: 1,
        unit_cost: product.purchase_price || product.cost_price || 0,
      }]);
    }
    setSearchTerm("");
    setShowProductSearch(false);
  };

  const addManualItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      sku: "",
      title: "",
      quantity_ordered: 1,
      unit_cost: 0,
    }]);
  };

  const updateItem = (id: string, updates: Partial<POItem>) => {
    setItems(items.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleSubmit = async () => {
    if (!canCreatePO) {
      setShowUpgradePrompt(true);
      return;
    }

    if (!supplierId || items.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fournisseur et ajouter des articles",
        variant: "destructive",
      });
      return;
    }

    try {
      const poId = await createPO.mutateAsync({
        supplier_id: supplierId,
        items: items.map(i => ({
          product_id: i.product_id,
          sku: i.sku,
          title: i.title,
          quantity_ordered: i.quantity_ordered,
          unit_cost: i.unit_cost,
        })),
        notes: notes || undefined,
        expected_date: expectedDate || undefined,
        shipping_cost: shippingCost,
        currency,
      });

      toast({
        title: "Commande créée",
        description: "La commande fournisseur a été créée avec succès",
      });

      onNavigate(`/purchase-orders/${poId}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      // Check for CBAC error
      if (errorMessage.includes('CAPABILITY_REQUIRED')) {
        setShowUpgradePrompt(true);
        return;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upgrade Prompt */}
      <UpgradePrompt
        capability="purchase_orders"
        open={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
      />

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => onNavigate("/purchase-orders")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nouvelle commande fournisseur</h1>
          <p className="text-muted-foreground">Étape {step} sur 3</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              "flex-1 h-2 rounded-full transition-colors",
              s <= step ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step 1: Select Supplier */}
      {step === 1 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Sélectionner un fournisseur</h2>
          
          {suppliersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.filter(s => s.active).map((supplier) => (
                <button
                  key={supplier.id}
                  onClick={() => setSupplierId(supplier.id)}
                  className={cn(
                    "p-4 rounded-lg border text-left transition-all",
                    supplierId === supplier.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-secondary/50"
                  )}
                >
                  <div className="font-medium">{supplier.name}</div>
                  {supplier.email && (
                    <div className="text-sm text-muted-foreground">{supplier.email}</div>
                  )}
                  {supplier.city && supplier.country && (
                    <div className="text-sm text-muted-foreground">
                      {supplier.city}, {supplier.country}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => setStep(2)} 
              disabled={!supplierId}
            >
              Continuer
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Add Items */}
      {step === 2 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Ajouter des articles</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addManualItem}>
                <Plus className="w-4 h-4 mr-2" />
                Article manuel
              </Button>
            </div>
          </div>

          {/* Product Search */}
          <div className="relative mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit du catalogue..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowProductSearch(true);
                }}
                onFocus={() => setShowProductSearch(true)}
                onBlur={() => {
                  // Delay to allow click on dropdown item
                  setTimeout(() => setShowProductSearch(false), 200);
                }}
                className="pl-10"
              />
            </div>
            
            {showProductSearch && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {supplierProducts.length > 0 ? (
                  supplierProducts.slice(0, 10).map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addItem(product)}
                      className="w-full p-3 text-left hover:bg-secondary/50 border-b border-border last:border-0 flex items-center gap-3"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {product.artist_name && <span>{product.artist_name} - </span>}
                          {product.title}
                        </div>
                        <div className="text-sm text-muted-foreground">{product.sku}</div>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(product.purchase_price || product.cost_price || 0)}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    {searchTerm ? "Aucun produit trouvé" : "Aucun produit pour ce fournisseur"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          {items.length > 0 ? (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left py-2 px-3 font-medium">SKU</th>
                    <th className="text-left py-2 px-3 font-medium">Désignation</th>
                    <th className="text-right py-2 px-3 font-medium w-24">Qté</th>
                    <th className="text-right py-2 px-3 font-medium w-32">Coût unit.</th>
                    <th className="text-right py-2 px-3 font-medium w-32">Total</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-3">
                        <Input
                          value={item.sku}
                          onChange={(e) => updateItem(item.id, { sku: e.target.value })}
                          className="h-8"
                          placeholder="SKU"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(item.id, { title: e.target.value })}
                          className="h-8"
                          placeholder="Titre"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity_ordered}
                          onChange={(e) => updateItem(item.id, { quantity_ordered: parseInt(e.target.value) || 1 })}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unit_cost}
                          onChange={(e) => updateItem(item.id, { unit_cost: parseFloat(e.target.value) || 0 })}
                          className="h-8 text-right"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(item.quantity_ordered * item.unit_cost)}
                      </td>
                      <td className="py-2 px-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
              Aucun article ajouté. Recherchez un produit ou ajoutez un article manuellement.
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep(1)}>
              Retour
            </Button>
            <Button onClick={() => setStep(3)} disabled={items.length === 0}>
              Continuer
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Récapitulatif</h2>

          {/* Supplier Info */}
          <div className="mb-6 p-4 bg-secondary/30 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Fournisseur</div>
            <div className="font-medium">{selectedSupplier?.name}</div>
            {selectedSupplier?.email && (
              <div className="text-sm text-muted-foreground">{selectedSupplier.email}</div>
            )}
          </div>

          {/* Items Summary */}
          <div className="mb-6">
            <h3 className="font-medium mb-2">Articles ({items.length})</h3>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50 border-b border-border">
                    <th className="text-left py-2 px-3 font-medium">SKU</th>
                    <th className="text-left py-2 px-3 font-medium">Désignation</th>
                    <th className="text-right py-2 px-3 font-medium">Qté</th>
                    <th className="text-right py-2 px-3 font-medium">Coût unit.</th>
                    <th className="text-right py-2 px-3 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-2 px-3">{item.sku || '—'}</td>
                      <td className="py-2 px-3">{item.title}</td>
                      <td className="py-2 px-3 text-right">{item.quantity_ordered}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(item.unit_cost)}</td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatCurrency(item.quantity_ordered * item.unit_cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label>Frais de port</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={shippingCost}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label>Date de livraison prévue</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-6">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes internes ou instructions pour le fournisseur..."
              rows={3}
            />
          </div>

          {/* Totals */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de port</span>
                  <span>{formatCurrency(shippingCost)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep(2)}>
              Retour
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createPO.isPending}
            >
              {createPO.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer la commande
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
