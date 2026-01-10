import { useState, useMemo } from "react";
import { X, ShoppingCart, Plus, Trash2, Loader2, Search, UserPlus, User, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
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

const SALES_CHANNELS = [
  { value: "web", label: "Site web" },
  { value: "marketplace", label: "Marketplace (Discogs, eBay...)" },
  { value: "shop", label: "Boutique physique" },
  { value: "phone", label: "Téléphone" },
  { value: "other", label: "Autre" },
] as const;

const SHIPPING_METHODS = [
  { value: "colissimo", label: "Colissimo", defaultCost: 6.50 },
  { value: "mondial_relay", label: "Mondial Relay", defaultCost: 4.50 },
  { value: "retrait", label: "Retrait en boutique", defaultCost: 0 },
  { value: "other", label: "Autre", defaultCost: 0 },
] as const;

const PAYMENT_METHODS = [
  { value: "cb", label: "Carte bancaire", autoStatus: "paid" as const },
  { value: "paypal", label: "PayPal", autoStatus: "paid" as const },
  { value: "especes", label: "Espèces", autoStatus: "paid" as const },
  { value: "virement", label: "Virement bancaire", autoStatus: "pending" as const },
  { value: "cheque", label: "Chèque", autoStatus: "pending" as const },
  { value: "other", label: "Autre", autoStatus: "pending" as const },
] as const;

export function OrderFormModal({ isOpen, onClose }: OrderFormProps) {
  const { toast } = useToast();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const createOrder = useCreateOrder();
  const createCustomer = useCreateCustomer();

  // Sales channel
  const [salesChannel, setSalesChannel] = useState<string>("web");

  // Customer selection mode
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [saveNewCustomer, setSaveNewCustomer] = useState(true);

  // Form data for new customer
  const [formData, setFormData] = useState({
    customer_email: "",
    customer_name: "",
    shipping_address: "",
    shipping_city: "",
    shipping_postal_code: "",
    shipping_country: "France",
  });

  // Shipping
  const [shippingMethod, setShippingMethod] = useState<string>("colissimo");
  const [shippingAmount, setShippingAmount] = useState<number>(6.50);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<string>("cb");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("paid");

  // Discount
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");

  const [items, setItems] = useState<OrderItemForm[]>([]);

  // Update shipping cost when method changes
  const handleShippingMethodChange = (method: string) => {
    setShippingMethod(method);
    const methodData = SHIPPING_METHODS.find(m => m.value === method);
    if (methodData) {
      setShippingAmount(methodData.defaultCost);
    }
  };

  // Update payment status when method changes
  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);
    const methodData = PAYMENT_METHODS.find(m => m.value === method);
    if (methodData) {
      setPaymentStatus(methodData.autoStatus);
    }
  };

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 20);
    const search = customerSearch.toLowerCase();
    return customers
      .filter(c => 
        c.email?.toLowerCase().includes(search) ||
        c.first_name?.toLowerCase().includes(search) ||
        c.last_name?.toLowerCase().includes(search)
      )
      .slice(0, 20);
  }, [customers, customerSearch]);

  // Get selected customer data
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Auto-fill form when selecting existing customer
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setFormData({
        customer_email: customer.email,
        customer_name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        shipping_address: customer.address || "",
        shipping_city: customer.city || "",
        shipping_postal_code: customer.postal_code || "",
        shipping_country: customer.country || "France",
      });
    }
  };

  if (!isOpen) return null;

  const isLoading = createOrder.isPending || createCustomer.isPending;

  const addItem = () => {
    setItems([...items, { product_id: "", title: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalBeforeDiscount = subtotal + shippingAmount;
  const total = Math.max(0, totalBeforeDiscount - discountAmount);

  const resetForm = () => {
    setSalesChannel("web");
    setCustomerMode("existing");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setSaveNewCustomer(true);
    setFormData({
      customer_email: "",
      customer_name: "",
      shipping_address: "",
      shipping_city: "",
      shipping_postal_code: "",
      shipping_country: "France",
    });
    setShippingMethod("colissimo");
    setShippingAmount(6.50);
    setPaymentMethod("cb");
    setPaymentStatus("paid");
    setDiscountAmount(0);
    setDiscountReason("");
    setItems([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const customerEmail = customerMode === "existing" && selectedCustomer 
      ? selectedCustomer.email 
      : formData.customer_email;

    if (!customerEmail) {
      toast({ title: "Erreur", description: "L'email client est requis", variant: "destructive" });
      return;
    }
    
    if (items.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un article", variant: "destructive" });
      return;
    }

    try {
      let customerId: string | null = null;

      // Handle customer creation for new customers
      if (customerMode === "new" && saveNewCustomer) {
        // Check if email already exists
        const existingCustomer = customers.find(c => c.email === formData.customer_email);
        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Parse name into first and last name
          const nameParts = formData.customer_name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';

          const newCustomer = await createCustomer.mutateAsync({
            email: formData.customer_email,
            first_name: firstName || null,
            last_name: lastName || null,
            address: formData.shipping_address || null,
            city: formData.shipping_city || null,
            postal_code: formData.shipping_postal_code || null,
            country: formData.shipping_country || null,
          });
          customerId = newCustomer.id;
        }
      } else if (customerMode === "existing" && selectedCustomerId) {
        customerId = selectedCustomerId;
      }

      const orderData: OrderInsert = {
        order_number: `ORD-${Date.now()}`,
        customer_email: customerEmail,
        customer_name: customerMode === "existing" && selectedCustomer 
          ? `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() 
          : formData.customer_name || null,
        customer_id: customerId,
        source: salesChannel,
        shipping_address: customerMode === "existing" && selectedCustomer 
          ? selectedCustomer.address 
          : formData.shipping_address || null,
        shipping_city: customerMode === "existing" && selectedCustomer 
          ? selectedCustomer.city 
          : formData.shipping_city || null,
        shipping_postal_code: customerMode === "existing" && selectedCustomer 
          ? selectedCustomer.postal_code 
          : formData.shipping_postal_code || null,
        shipping_country: customerMode === "existing" && selectedCustomer 
          ? selectedCustomer.country 
          : formData.shipping_country || null,
        shipping_method: SHIPPING_METHODS.find(m => m.value === shippingMethod)?.label || shippingMethod,
        shipping_amount: shippingAmount,
        payment_method: PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label || paymentMethod,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        internal_notes: discountReason && discountAmount > 0 ? `Remise: ${discountReason}` : null,
        subtotal,
        total,
        status: "pending",
        payment_status: paymentStatus,
        paid_at: paymentStatus === "paid" ? new Date().toISOString() : null,
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
      resetForm();
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
          {/* Sales Channel */}
          <div>
            <Label className="text-sm font-semibold">Canal de vente</Label>
            <Select value={salesChannel} onValueChange={setSalesChannel}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Sélectionner un canal..." />
              </SelectTrigger>
              <SelectContent>
                {SALES_CHANNELS.map(channel => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Customer Selection */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Informations client</h3>
            
            <Tabs value={customerMode} onValueChange={(v) => setCustomerMode(v as "existing" | "new")} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="existing" className="gap-2">
                  <User className="w-4 h-4" />
                  Client existant
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Nouveau client
                </TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="space-y-4">
                {/* Customer Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Rechercher par nom ou email..."
                    className="pl-10"
                  />
                </div>

                {/* Customer List */}
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Aucun client trouvé
                    </div>
                  ) : (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => handleSelectCustomer(customer.id)}
                        className={`w-full p-3 text-left hover:bg-secondary/50 transition-colors ${
                          selectedCustomerId === customer.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                        }`}
                      >
                        <div className="font-medium text-sm">
                          {customer.first_name} {customer.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">{customer.email}</div>
                        {customer.city && (
                          <div className="text-xs text-muted-foreground mt-1">{customer.city}, {customer.country}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Selected Customer Summary */}
                {selectedCustomer && (
                  <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                    <div className="text-sm font-medium">Client sélectionné</div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Nom:</span> {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Email:</span> {selectedCustomer.email}
                    </div>
                    {selectedCustomer.address && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Adresse:</span> {selectedCustomer.address}, {selectedCustomer.city} {selectedCustomer.postal_code}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="new" className="space-y-4">
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
                    <Label className="text-sm font-medium text-muted-foreground">Nom complet</Label>
                    <Input
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="Jean Dupont"
                      className="mt-1.5"
                    />
                  </div>
                </div>

                {/* Shipping address for new customer */}
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium mb-3">Adresse de livraison</h4>
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
                    <div className="col-span-2">
                      <Label className="text-sm font-medium text-muted-foreground">Pays</Label>
                      <Input
                        value={formData.shipping_country}
                        onChange={(e) => setFormData({ ...formData, shipping_country: e.target.value })}
                        placeholder="France"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Save customer checkbox */}
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="save-customer"
                    checked={saveNewCustomer}
                    onCheckedChange={(checked) => setSaveNewCustomer(checked === true)}
                  />
                  <Label htmlFor="save-customer" className="text-sm cursor-pointer">
                    Enregistrer ce client pour le futur
                  </Label>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Shipping */}
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
                        {method.label} {method.defaultCost > 0 && `(${formatCurrency(method.defaultCost)})`}
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
                  value={shippingAmount}
                  onChange={(e) => setShippingAmount(Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Paiement</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Mode de paiement</Label>
                <Select value={paymentMethod} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Statut du paiement</Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as "pending" | "paid")}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Payé</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Discount */}
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Remise
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Montant de la remise (€)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Raison (optionnel)</Label>
                <Input
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  placeholder="Ex: Client fidèle, promotion..."
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

            {/* Totals */}
            {items.length > 0 && (
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
            <Button 
              type="submit" 
              disabled={isLoading || items.length === 0 || (customerMode === "existing" && !selectedCustomerId) || (customerMode === "new" && !formData.customer_email)}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer la commande
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
