import { useState, useEffect, useMemo } from "react";
import { X, ShoppingCart, Plus, Trash2, Loader2, Search, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useUpdateOrder, useUpdateOrderItems, type Order, type OrderItem, type OrderUpdate } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/format";

type OrderWithItems = Order & { order_items?: OrderItem[] };

interface OrderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderWithItems;
}

interface OrderItemForm {
  id?: string;
  product_id: string | null;
  title: string;
  quantity: number;
  unit_price: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

const SHIPPING_METHODS = [
  { value: "Colissimo", label: "Colissimo", defaultCost: 6.50 },
  { value: "Mondial Relay", label: "Mondial Relay", defaultCost: 4.50 },
  { value: "Livraison standard", label: "Livraison standard", defaultCost: 5.00 },
  { value: "DHL Express", label: "DHL Express", defaultCost: 15.00 },
  { value: "UPS", label: "UPS", defaultCost: 12.00 },
  { value: "Retrait", label: "Retrait", defaultCost: 0 },
  { value: "Autre", label: "Autre", defaultCost: 0 },
] as const;

export function OrderEditModal({ isOpen, onClose, order }: OrderEditModalProps) {
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const updateOrder = useUpdateOrder();
  const updateOrderItems = useUpdateOrderItems();

  // Shipping
  const [shippingMethod, setShippingMethod] = useState(order.shipping_method || "");
  const [shippingAmount, setShippingAmount] = useState(order.shipping_amount || 0);
  
  // Shipping address
  const [shippingAddress, setShippingAddress] = useState(order.shipping_address || "");
  const [shippingCity, setShippingCity] = useState(order.shipping_city || "");
  const [shippingPostalCode, setShippingPostalCode] = useState(order.shipping_postal_code || "");
  const [shippingCountry, setShippingCountry] = useState(order.shipping_country || "France");

  // Discount
  const [discountAmount, setDiscountAmount] = useState(order.discount_amount || 0);

  // Internal notes
  const [internalNotes, setInternalNotes] = useState(order.internal_notes || "");

  // Order items
  const [items, setItems] = useState<OrderItemForm[]>([]);
  
  // Product search
  const [productSearch, setProductSearch] = useState("");

  // Initialize items from order
  useEffect(() => {
    if (order.order_items) {
      setItems(order.order_items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        isNew: false,
        isDeleted: false,
      })));
    }
  }, [order.order_items]);

  // Reset form when order changes
  useEffect(() => {
    setShippingMethod(order.shipping_method || "");
    setShippingAmount(order.shipping_amount || 0);
    setShippingAddress(order.shipping_address || "");
    setShippingCity(order.shipping_city || "");
    setShippingPostalCode(order.shipping_postal_code || "");
    setShippingCountry(order.shipping_country || "France");
    setDiscountAmount(order.discount_amount || 0);
    setInternalNotes(order.internal_notes || "");
  }, [order]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 10);
    const search = productSearch.toLowerCase();
    return products
      .filter(p => 
        p.title?.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.artist_name?.toLowerCase().includes(search)
      )
      .slice(0, 10);
  }, [products, productSearch]);

  if (!isOpen) return null;

  const isLoading = updateOrder.isPending || updateOrderItems.isPending;

  const addItem = () => {
    setItems([...items, { 
      product_id: null, 
      title: "", 
      quantity: 1, 
      unit_price: 0, 
      isNew: true,
      isDeleted: false 
    }]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    if (newItems[index].isNew) {
      // For new items, just remove from array
      newItems.splice(index, 1);
    } else {
      // For existing items, mark as deleted
      newItems[index].isDeleted = true;
    }
    setItems(newItems);
  };

  const restoreItem = (index: number) => {
    const newItems = [...items];
    newItems[index].isDeleted = false;
    setItems(newItems);
  };

  const updateItem = (index: number, updates: Partial<OrderItemForm>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    if (updates.product_id) {
      const product = products.find(p => p.id === updates.product_id);
      if (product) {
        newItems[index].title = product.title;
        newItems[index].unit_price = product.selling_price;
      }
    }
    
    setItems(newItems);
  };

  const activeItems = items.filter(item => !item.isDeleted);
  const subtotal = activeItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalBeforeDiscount = subtotal + shippingAmount;
  const total = Math.max(0, totalBeforeDiscount - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeItems.length === 0) {
      toast({ title: "Erreur", description: "La commande doit contenir au moins un article", variant: "destructive" });
      return;
    }

    try {
      // Update order details
      const orderUpdate: OrderUpdate & { id: string } = {
        id: order.id,
        shipping_method: shippingMethod || null,
        shipping_amount: shippingAmount,
        shipping_address: shippingAddress || null,
        shipping_city: shippingCity || null,
        shipping_postal_code: shippingPostalCode || null,
        shipping_country: shippingCountry || null,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        internal_notes: internalNotes || null,
        subtotal,
        total,
      };

      await updateOrder.mutateAsync(orderUpdate);

      // Update order items
      const itemsToDelete = items.filter(item => item.isDeleted && item.id).map(item => item.id!);
      const itemsToUpdate = items.filter(item => !item.isDeleted && !item.isNew && item.id).map(item => ({
        id: item.id!,
        product_id: item.product_id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));
      const itemsToCreate = items.filter(item => !item.isDeleted && item.isNew).map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      await updateOrderItems.mutateAsync({
        orderId: order.id,
        itemsToDelete,
        itemsToUpdate,
        itemsToCreate,
      });

      toast({ title: "Succès", description: "Commande mise à jour avec succès" });
      onClose();
    } catch (error) {
      console.error('Order update error:', error);
      toast({ 
        title: "Erreur", 
        description: error instanceof Error ? error.message : "Une erreur est survenue", 
        variant: "destructive" 
      });
    }
  };

  const handleShippingMethodChange = (method: string) => {
    setShippingMethod(method);
    const methodData = SHIPPING_METHODS.find(m => m.value === method);
    if (methodData) {
      setShippingAmount(methodData.defaultCost);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Modifier la commande</h2>
              <p className="text-sm text-muted-foreground">{order.order_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Info (read-only) */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-2">Client</h3>
            <div className="text-sm">
              <div className="font-medium">{order.customer_name || 'N/A'}</div>
              <div className="text-muted-foreground">{order.customer_email}</div>
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Adresse de livraison</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Adresse</Label>
                <Input
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="123 rue de la Paix"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Ville</Label>
                <Input
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  placeholder="Paris"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Code postal</Label>
                <Input
                  value={shippingPostalCode}
                  onChange={(e) => setShippingPostalCode(e.target.value)}
                  placeholder="75001"
                  className="mt-1.5"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Pays</Label>
                <Input
                  value={shippingCountry}
                  onChange={(e) => setShippingCountry(e.target.value)}
                  placeholder="France"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Shipping Method */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Livraison</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Mode de livraison</Label>
                <Select value={shippingMethod} onValueChange={handleShippingMethodChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Frais de port (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingAmount === 0 ? "" : shippingAmount}
                  onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Discount */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Remise</h3>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Montant de la remise (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discountAmount === 0 ? "" : discountAmount}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="mt-1.5 max-w-xs"
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Notes internes</h3>
            <Textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Notes visibles uniquement par l'équipe..."
              rows={3}
            />
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Articles</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter un article
              </Button>
            </div>

            {/* Product search for new items */}
            {items.some(item => item.isNew && !item.product_id) && (
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="pl-10"
                />
                {productSearch && (
                  <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg shadow-lg mt-1 z-20 max-h-48 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => {
                          const newItemIndex = items.findIndex(item => item.isNew && !item.product_id);
                          if (newItemIndex !== -1) {
                            updateItem(newItemIndex, { 
                              product_id: product.id,
                              title: product.title,
                              unit_price: product.selling_price 
                            });
                          }
                          setProductSearch("");
                        }}
                        className="w-full p-3 text-left hover:bg-secondary transition-colors flex items-center gap-3"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium">{product.title}</div>
                          <div className="text-xs text-muted-foreground">{product.artist_name} • {product.sku}</div>
                        </div>
                        <div className="text-sm font-medium">{formatCurrency(product.selling_price)}</div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="p-3 text-sm text-muted-foreground text-center">Aucun produit trouvé</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Items list */}
            <div className="space-y-3">
              {items.map((item, index) => (
                <div 
                  key={item.id || `new-${index}`} 
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    item.isDeleted 
                      ? 'bg-destructive/10 border-destructive/20 opacity-60' 
                      : item.isNew 
                        ? 'bg-success/10 border-success/20'
                        : 'bg-secondary border-border'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(index, { title: e.target.value })}
                      placeholder="Titre du produit"
                      disabled={item.isDeleted}
                      className="font-medium"
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: parseInt(e.target.value) || 1 })}
                      disabled={item.isDeleted}
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                      disabled={item.isDeleted}
                    />
                  </div>
                  <div className="w-24 text-right font-semibold tabular-nums">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </div>
                  {item.isDeleted ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => restoreItem(index)}
                      className="text-success hover:text-success"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            {activeItems.length > 0 && (
              <div className="flex justify-end mt-4 pt-4 border-t border-border">
                <div className="text-right space-y-1">
                  <div className="flex justify-between gap-8 text-sm">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-sm">
                    <span className="text-muted-foreground">Livraison</span>
                    <span className="tabular-nums">{formatCurrency(shippingAmount)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between gap-8 text-sm text-green-600">
                      <span>Remise</span>
                      <span className="tabular-nums">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-8 pt-2 border-t border-border">
                    <span className="font-medium">Total</span>
                    <span className="text-xl font-bold tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || activeItems.length === 0}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
