import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ShoppingBag, 
  Loader2, 
  CreditCard, 
  Truck, 
  Receipt,
  Building2,
  Info,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProAuth } from "@/hooks/useProAuth";
import { useCart } from "@/hooks/useCart";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { calculateVatInfo, calculateShippingInfo } from "@/lib/vat-shipping-utils";

const MIN_ORDER_AMOUNT = 100;

type PaymentMethod = 'bank_transfer' | 'paypal';

export function ProCheckout() {
  const navigate = useNavigate();
  const { customer } = useProAuth();
  const { items, clearCart, getSubtotal } = useCart();
  const { data: settings } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bank_transfer');

  // Calculate prices
  const discountRate = customer?.discount_rate || 0;
  const subtotalBrut = getSubtotal();
  const discountAmount = subtotalBrut * (discountRate / 100);
  const subtotalHT = subtotalBrut - discountAmount;

  // VAT calculation
  const vatInfo = calculateVatInfo(customer?.country, customer?.vat_number);
  const vatAmount = subtotalHT * (vatInfo.rate / 100);

  // Shipping calculation
  const shippingInfo = calculateShippingInfo(customer?.country, subtotalHT);
  const shippingCost = shippingInfo.finalCost;

  // Totals
  const totalTTC = subtotalHT + vatAmount + shippingCost;
  const canOrder = subtotalHT >= MIN_ORDER_AMOUNT;

  // Generate order reference for bank transfer
  const generateOrderRef = () => `PRO-${Date.now().toString(36).toUpperCase()}`;

  const handleSubmitOrder = async () => {
    if (!customer || !canOrder) return;

    setIsSubmitting(true);
    try {
      const orderNumber = generateOrderRef();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customer.id,
          customer_email: customer.email,
          customer_name: customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          subtotal: subtotalHT,
          discount_amount: discountAmount,
          tax_amount: vatAmount,
          shipping_amount: shippingCost,
          total: totalTTC,
          status: 'pending',
          payment_status: 'pending',
          payment_method: paymentMethod === 'bank_transfer' ? 'Virement bancaire' : 'PayPal',
          source: 'pro_portal',
          shipping_address: customer.address,
          shipping_address_line_2: customer.address_line_2,
          shipping_city: customer.city,
          shipping_postal_code: customer.postal_code,
          shipping_country: customer.country,
          shipping_phone: customer.phone,
          internal_notes: `Commande Pro - Remise ${discountRate}% - ${vatInfo.label}`
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        title: item.product.title,
        artist_name: item.product.artist_name,
        sku: item.product.sku,
        format: item.product.format,
        image_url: item.product.image_url,
        quantity: item.quantity,
        unit_price: item.product.selling_price * (1 - discountRate / 100),
        total_price: item.product.selling_price * item.quantity * (1 - discountRate / 100),
        supplier_id: item.product.supplier_id,
        supplier_name: item.product.supplier_name
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      clearCart();

      toast({
        title: "Commande confirmée !",
        description: `Votre commande ${orderNumber} a été enregistrée.`
      });

      // Navigate to success page with order data
      navigate('/pro/order-success', { 
        state: { 
          order: {
            ...order,
            order_items: orderItems.map((item, idx) => ({
              ...item,
              id: `temp-${idx}`
            }))
          },
          vatLabel: vatInfo.label,
          paymentTerms: customer?.payment_terms?.toString() || '30'
        }
      });
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de passer la commande. Veuillez réessayer.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Votre panier est vide</h2>
        <p className="text-muted-foreground mb-6">
          Parcourez notre catalogue pour ajouter des produits.
        </p>
        <Link to="/pro/catalog">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voir le catalogue
          </Button>
        </Link>
      </div>
    );
  }

  const paymentTerms = customer?.payment_terms || settings?.payment_terms_text ? 
    `${customer?.payment_terms || 30}` : '30';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/pro/cart">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Finaliser la commande</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column - Order details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Récapitulatif de commande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Items list */}
              <div className="space-y-3">
                {items.map(item => {
                  const unitPriceHT = item.product.selling_price * (1 - discountRate / 100);
                  return (
                    <div 
                      key={item.product.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.product.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.product.artist_name || '—'} • {item.quantity} × {formatCurrency(unitPriceHT)}
                        </p>
                      </div>
                      <p className="font-medium ml-4">
                        {formatCurrency(unitPriceHT * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Totals breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total brut</span>
                  <span>{formatCurrency(subtotalBrut)}</span>
                </div>
                {discountRate > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Remise pro ({discountRate}%)</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Sous-total HT</span>
                  <span>{formatCurrency(subtotalHT)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Estimate */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Frais de port estimés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {shippingInfo.zone === 'france' && 'Livraison France'}
                    {shippingInfo.zone === 'eu' && 'Livraison Europe'}
                    {shippingInfo.zone === 'world' && 'Livraison internationale'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {customer?.city}, {customer?.country}
                  </p>
                </div>
                <div className="text-right">
                  {shippingInfo.isFree ? (
                    <div>
                      <span className="text-success font-medium">Gratuit</span>
                      <p className="text-xs text-muted-foreground line-through">
                        {formatCurrency(shippingInfo.baseCost)}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium">{formatCurrency(shippingCost)}</span>
                      <p className="text-xs text-muted-foreground">
                        Gratuit dès {formatCurrency(shippingInfo.freeThreshold)} HT
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <Alert className="bg-muted/50 border-muted">
                <Info className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Frais de port estimés, peuvent varier selon le poids final
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Mode de paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup 
                value={paymentMethod} 
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="space-y-3"
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setPaymentMethod('bank_transfer')}
                >
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                  <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                    <span className="font-medium">Virement bancaire</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setPaymentMethod('paypal')}
                >
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                    <span className="font-medium">PayPal</span>
                  </Label>
                </div>
              </RadioGroup>

              {/* Bank details */}
              {paymentMethod === 'bank_transfer' && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-lg space-y-2 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Coordonnées bancaires
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
                    <span>Banque:</span>
                    <span className="font-medium text-foreground">{settings?.bank_name || '—'}</span>
                    <span>IBAN:</span>
                    <span className="font-medium text-foreground font-mono text-xs">{settings?.iban || '—'}</span>
                    <span>BIC:</span>
                    <span className="font-medium text-foreground font-mono">{settings?.bic || '—'}</span>
                    <span>Référence:</span>
                    <span className="font-medium text-foreground">À indiquer après confirmation</span>
                  </div>
                </div>
              )}

              {/* PayPal info */}
              {paymentMethod === 'paypal' && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-lg space-y-2 text-sm">
                  <p className="font-medium">Paiement PayPal</p>
                  <p className="text-muted-foreground">
                    Paiement à effectuer sur: <span className="font-medium text-foreground">{settings?.paypal_email || settings?.shop_email || '—'}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column - Summary & Submit */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total HT</span>
                  <span>{formatCurrency(subtotalHT)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{vatInfo.label}</span>
                  <span>{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frais de port</span>
                  <span>{shippingInfo.isFree ? <span className="text-success">Gratuit</span> : formatCurrency(shippingCost)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total TTC</span>
                  <span>{formatCurrency(totalTTC)}</span>
                </div>
              </div>

              {/* Payment terms */}
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Conditions:</span> Paiement à {paymentTerms} jours
                </p>
              </div>

              {/* Minimum order warning */}
              {!canOrder && (
                <Alert variant="destructive" className="bg-destructive/10">
                  <AlertDescription>
                    Commande minimum: {formatCurrency(MIN_ORDER_AMOUNT)} HT. 
                    Il vous manque {formatCurrency(MIN_ORDER_AMOUNT - subtotalHT)}.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                className="w-full" 
                size="lg"
                disabled={!canOrder || isSubmitting}
                onClick={handleSubmitOrder}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Confirmer la commande
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                En confirmant, vous acceptez nos conditions générales de vente
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
