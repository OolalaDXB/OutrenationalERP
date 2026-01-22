import { useState, useEffect } from "react";
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
  CheckCircle2,
  Wallet,
  Bitcoin,
  Globe,
  Copy,
  Check
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useProAuth } from "@/hooks/useProAuth";
import { useCart } from "@/hooks/useCart";
import { useSettings } from "@/hooks/useSettings";
import { useActivePaymentMethodsForCurrency, type PaymentMethod } from "@/hooks/usePaymentMethods";
import { useDefaultBankAccount } from "@/hooks/useBankAccounts";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { calculateVatInfo, calculateShippingInfo } from "@/lib/vat-shipping-utils";

const MIN_ORDER_AMOUNT = 100;

// EUR zone countries
const EUR_ZONE_COUNTRIES = [
  'France', 'Germany', 'Belgium', 'Netherlands', 'Italy', 'Spain', 'Portugal',
  'Austria', 'Ireland', 'Luxembourg', 'Finland', 'Greece', 'Slovakia', 'Slovenia',
  'Estonia', 'Latvia', 'Lithuania', 'Malta', 'Cyprus', 'Andorra', 'Monaco',
  'FR', 'DE', 'BE', 'NL', 'IT', 'ES', 'PT', 'AT', 'IE', 'LU', 'FI', 'GR', 
  'SK', 'SI', 'EE', 'LV', 'LT', 'MT', 'CY', 'AD', 'MC'
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Wallet,
  CreditCard,
  Bitcoin,
};

export function ProCheckout() {
  const navigate = useNavigate();
  const { customer } = useProAuth();
  const { items, clearCart, getSubtotal } = useCart();
  const { data: settings } = useSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  // Currency selection
  const isEurZone = customer?.country ? EUR_ZONE_COUNTRIES.includes(customer.country) : true;
  const defaultCurrency = (customer as any)?.preferred_currency || (isEurZone ? 'EUR' : 'USD');
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency);
  
  // Payment methods
  const { data: paymentMethods = [], isLoading: methodsLoading } = useActivePaymentMethodsForCurrency(selectedCurrency);
  const [selectedMethodCode, setSelectedMethodCode] = useState<string>('');
  
  // Bank account for selected currency
  const { data: bankAccount } = useDefaultBankAccount(selectedCurrency);

  // Set default payment method when methods load
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethodCode) {
      setSelectedMethodCode(paymentMethods[0].code);
    }
  }, [paymentMethods, selectedMethodCode]);

  // Reset payment method when currency changes
  useEffect(() => {
    setSelectedMethodCode('');
  }, [selectedCurrency]);

  const selectedMethod = paymentMethods.find(m => m.code === selectedMethodCode);

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

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getPaymentMethodLabel = (code: string) => {
    switch (code) {
      case 'bank_transfer': return 'Virement bancaire';
      case 'paypal': return 'PayPal';
      case 'stripe': return 'Carte bancaire';
      case 'crypto': return 'Stablecoins (USDC/USDT)';
      default: return code;
    }
  };

  const handleSubmitOrder = async () => {
    if (!customer || !canOrder || !selectedMethodCode) return;

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
          payment_method: getPaymentMethodLabel(selectedMethodCode),
          payment_method_code: selectedMethodCode,
          currency: selectedCurrency,
          source: 'pro_portal',
          shipping_address: customer.address,
          shipping_address_line_2: customer.address_line_2,
          shipping_city: customer.city,
          shipping_postal_code: customer.postal_code,
          shipping_country: customer.country,
          shipping_phone: customer.phone,
          internal_notes: `Commande Pro - Remise ${discountRate}% - ${vatInfo.label} - ${selectedCurrency}`
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
          paymentTerms: customer?.payment_terms?.toString() || '30',
          bankAccount,
          paymentMethod: selectedMethod
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

  const paymentTerms = customer?.payment_terms?.toString() || '30';

  const renderIcon = (iconName: string | null) => {
    const Icon = iconName ? ICON_MAP[iconName] || CreditCard : CreditCard;
    return <Icon className="w-5 h-5" />;
  };

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

          {/* Currency Selection (non-EUR zone only) */}
          {!isEurZone && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Devise de paiement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={selectedCurrency} 
                  onValueChange={setSelectedCurrency}
                  className="flex gap-4"
                >
                  <div 
                    className={`flex-1 flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${selectedCurrency === 'EUR' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setSelectedCurrency('EUR')}
                  >
                    <RadioGroupItem value="EUR" id="eur" />
                    <Label htmlFor="eur" className="flex-1 cursor-pointer">
                      <span className="font-medium">Payer en EUR (€)</span>
                    </Label>
                  </div>
                  <div 
                    className={`flex-1 flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${selectedCurrency === 'USD' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setSelectedCurrency('USD')}
                  >
                    <RadioGroupItem value="USD" id="usd" />
                    <Label htmlFor="usd" className="flex-1 cursor-pointer">
                      <span className="font-medium">Payer en USD ($)</span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Mode de paiement
                <Badge variant="outline" className="ml-2">{selectedCurrency}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {methodsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : paymentMethods.length === 0 ? (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Aucun moyen de paiement disponible pour {selectedCurrency}. Contactez-nous.
                  </AlertDescription>
                </Alert>
              ) : (
                <RadioGroup 
                  value={selectedMethodCode} 
                  onValueChange={setSelectedMethodCode}
                  className="space-y-3"
                >
                  {paymentMethods.map((method) => (
                    <div 
                      key={method.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${selectedMethodCode === method.code ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                      onClick={() => setSelectedMethodCode(method.code)}
                    >
                      <RadioGroupItem value={method.code} id={method.code} />
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedMethodCode === method.code ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {renderIcon(method.icon)}
                      </div>
                      <Label htmlFor={method.code} className="flex-1 cursor-pointer">
                        <span className="font-medium">{method.name}</span>
                        {method.description && (
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {/* Payment method details */}
              {selectedMethodCode === 'bank_transfer' && bankAccount && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-lg space-y-2 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Coordonnées bancaires ({bankAccount.currency})
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground">
                    <span>Banque:</span>
                    <span className="font-medium text-foreground">{bankAccount.bank_name}</span>
                    <span>IBAN:</span>
                    <span className="font-medium text-foreground font-mono text-xs">{bankAccount.iban}</span>
                    <span>BIC:</span>
                    <span className="font-medium text-foreground font-mono">{bankAccount.bic}</span>
                    <span>Référence:</span>
                    <span className="font-medium text-foreground">À indiquer après confirmation</span>
                  </div>
                </div>
              )}

              {selectedMethodCode === 'bank_transfer' && !bankAccount && (
                <Alert className="mt-4">
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Aucun compte bancaire configuré pour {selectedCurrency}. Les coordonnées seront fournies après confirmation.
                  </AlertDescription>
                </Alert>
              )}

              {selectedMethodCode === 'paypal' && selectedMethod && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-lg space-y-2 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Paiement PayPal
                  </p>
                  <p className="text-muted-foreground">
                    Paiement à effectuer sur: <span className="font-medium text-foreground">
                      {selectedMethod.config.email || settings?.paypal_email || settings?.shop_email || '—'}
                    </span>
                  </p>
                </div>
              )}

              {selectedMethodCode === 'stripe' && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg space-y-2 text-sm">
                  <p className="font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <CreditCard className="w-4 h-4" />
                    Paiement par carte
                  </p>
                  <p className="text-amber-600 dark:text-amber-500">
                    Bientôt disponible. Veuillez choisir un autre moyen de paiement.
                  </p>
                </div>
              )}

              {selectedMethodCode === 'crypto' && selectedMethod && (
                <div className="mt-4 p-4 bg-secondary/50 rounded-lg space-y-3 text-sm">
                  <p className="font-medium flex items-center gap-2">
                    <Bitcoin className="w-4 h-4" />
                    Paiement en Stablecoins
                  </p>
                  {selectedMethod.config.wallet_address ? (
                    <div className="space-y-3 text-muted-foreground">
                      <p>Envoyer <span className="font-medium text-foreground">{formatCurrency(totalTTC, 'USD')}</span> en USDC ou USDT à:</p>
                      
                      {/* QR Code */}
                      <div className="flex justify-center p-4 bg-white rounded-lg">
                        <QRCodeSVG 
                          value={selectedMethod.config.wallet_address} 
                          size={140}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                      
                      {/* Address with copy button */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 p-2 bg-background rounded border border-border font-mono text-xs break-all">
                          {selectedMethod.config.wallet_address}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyAddress(selectedMethod.config.wallet_address!)}
                          className="shrink-0"
                        >
                          {copiedAddress ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      
                      <p className="text-center">
                        Réseau: <span className="font-medium text-foreground capitalize">{selectedMethod.config.network || 'Ethereum'}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Adresse de wallet non configurée. Contactez-nous.</p>
                  )}
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
                disabled={!canOrder || isSubmitting || !selectedMethodCode || selectedMethodCode === 'stripe'}
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
