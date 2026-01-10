import { useState } from "react";
import { X, ShoppingCart, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useCreateOrder, type OrderInsert, type OrderItemInsert } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/format";

interface OrderFormProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrderItemForm {
  product_id: string;
  title: string;
  quantity: number;
  unit_price: number;
}

export function OrderFormModal({ isOpen, onClose }: OrderFormProps) {
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const createOrder = useCreateOrder();

  const [formData, setFormData] = useState({
    customer_email: "",
    customer_name: "",
    shipping_address: "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_country: "France",
  });

  const [items, setItems] = useState<OrderItemForm[]>([]);

  if (!isOpen) return null;

  const isLoading = createOrder.isPending;

  const addItem = () => {
    setItems([...items, { product_id: "", title: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<OrderItemForm>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    // If product selected, auto-fill title and price
    if (updates.product_id) {
      const product = products.find(p => p.id === updates.product_id);
      if (product) {
        newItems[index].title = product.title;
        newItems[index].unit_price = product.selling_price;
      }
    }
    
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const total = subtotal; // Could add shipping/tax here

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_email) {
      toast({ title: "Erreur", description: "L'email client est requis", variant: "destructive" });
      return;
    }
    
    if (items.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un article", variant: "destructive" });
      return;
    }

    try {
      const orderData: OrderInsert = {
        order_number: `ORD-${Date.now()}`,
        customer_email: formData.customer_email,
        customer_name: formData.customer_name || null,
        shipping_address: formData.shipping_address || null,
        shipping_city: formData.shipping_city || null,
        shipping_postal_code: formData.shipping_postal_code || null,
        shipping_country: formData.shipping_country || null,
        subtotal,
        total,
        status: "pending",
        payment_status: "pending",
      };

      const orderItems: Omit<OrderItemInsert, 'order_id'>[] = items.map(item => ({
        product_id: item.product_id || null,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      await createOrder.mutateAsync({ order: orderData, items: orderItems });
      toast({ title: "Succès", description: "Commande créée avec succès" });
      onClose();
      
      // Reset form
      setFormData({
        customer_email: "",
        customer_name: "",
        shipping_address: "",
        shipping_city: "",
        shipping_postal_code: "",
        shipping_country: "France",
      });
      setItems([]);
    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: error instanceof Error ? error.message : "Une erreur est survenue", 
        variant: "destructive" 
      });
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
              <h2 className="text-lg font-semibold">Nouvelle commande</h2>
              <p className="text-sm text-muted-foreground">Créer une commande manuelle</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client info */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Informations client</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email *</Label>
                <Input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="client@example.com"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nom</Label>
                <Input
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="Jean Dupont"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Adresse de livraison</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Adresse</Label>
                <Input
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  placeholder="123 rue de la Musique"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Ville</Label>
                <Input
                  value={formData.shipping_city}
                  onChange={(e) => setFormData({ ...formData, shipping_city: e.target.value })}
                  placeholder="Paris"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Code postal</Label>
                <Input
                  value={formData.shipping_postal_code}
                  onChange={(e) => setFormData({ ...formData, shipping_postal_code: e.target.value })}
                  placeholder="75001"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Order items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Articles</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>
            
            {items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                Aucun article. Cliquez sur "Ajouter" pour commencer.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-3 items-end p-3 bg-secondary/50 rounded-lg">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Produit</Label>
                      <select
                        value={item.product_id}
                        onChange={(e) => updateItem(index, { product_id: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-card text-sm"
                      >
                        <option value="">Sélectionner...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.title} - {formatCurrency(p.selling_price)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-20">
                      <Label className="text-xs text-muted-foreground">Qté</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: Number(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs text-muted-foreground">Prix</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div className="w-24 text-right font-semibold tabular-nums">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {items.length > 0 && (
              <div className="flex justify-end mt-4 pt-4 border-t border-border">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-xl font-bold tabular-nums">{formatCurrency(total)}</div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || items.length === 0}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer la commande
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
