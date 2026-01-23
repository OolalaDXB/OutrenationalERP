import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  CheckCircle, 
  Download, 
  ArrowRight, 
  Package, 
  CreditCard,
  Building2,
  Loader2,
  Wallet,
  Bitcoin,
  Copy,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency, formatDate } from "@/lib/format";
import { generateProPurchaseOrderPDF, downloadProPurchaseOrder } from "@/components/pro/ProPurchaseOrderPDF";
import { QRCodeSVG } from "qrcode.react";
import { type PaymentMethod } from "@/hooks/usePaymentMethods";
import { toast } from "sonner";

interface OrderItem {
  title: string;
  artist_name?: string | null;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderData {
  id: string;
  order_number: string;
  created_at: string | null;
  customer_name?: string | null;
  customer_email: string;
  shipping_address?: string | null;
  shipping_address_line_2?: string | null;
  shipping_city?: string | null;
  shipping_postal_code?: string | null;
  shipping_country?: string | null;
  subtotal: number;
  discount_amount?: number | null;
  tax_amount?: number | null;
  shipping_amount?: number | null;
  total: number;
  payment_method?: string | null;
  payment_method_code?: string | null;
  order_items?: OrderItem[];
}

interface LocationState {
  order: OrderData;
  vatLabel: string;
  paymentTerms: string;
  bankAccount?: { bank_name: string; iban: string; bic: string; currency: string } | null;
  paymentMethod?: PaymentMethod;
}

export function ProOrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  const state = location.state as LocationState | undefined;
  const order = state?.order;
  const vatLabel = state?.vatLabel || 'TVA (20%)';
  const paymentTerms = state?.paymentTerms || '30';
  const bankAccount = state?.bankAccount;
  const paymentMethod = state?.paymentMethod;

  // Redirect if no order data
  useEffect(() => {
    if (!order) {
      navigate('/pro/orders');
    }
  }, [order, navigate]);

  if (!order) {
    return null;
  }

  const handleDownloadPDF = async () => {
    if (!settings) {
      toast.error("Impossible de générer le PDF", {
        description: "Les paramètres de la boutique ne sont pas disponibles. Réessayez dans quelques secondes.",
      });
      return;
    }
    
    setIsGeneratingPDF(true);
    try {
      const doc = await generateProPurchaseOrderPDF({
        order,
        settings,
        vatLabel,
        paymentTerms
      });
      downloadProPurchaseOrder(doc, order.order_number);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Erreur lors de la génération du bon de commande");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shippingIsFree = (order.shipping_amount || 0) === 0;
  const isCryptoPayment = order.payment_method_code === 'crypto' || order.payment_method === 'Stablecoins (USDC/USDT)';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Header */}
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Commande confirmée !</h1>
        <p className="text-muted-foreground">
          Votre commande <span className="font-semibold text-foreground">{order.order_number}</span> a été enregistrée.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {formatDate(order.created_at)}
        </p>
      </div>

      {/* Order Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5" />
            Récapitulatif de commande
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Items list */}
          <div className="space-y-2">
            {order.order_items?.map((item, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.artist_name || '—'} • {item.quantity} × {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <p className="font-medium ml-4">
                  {formatCurrency(item.total_price)}
                </p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            {(order.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-success">
                <span>Remise Pro</span>
                <span>-{formatCurrency(order.discount_amount || 0)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{vatLabel}</span>
              <span>{formatCurrency(order.tax_amount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frais de port</span>
              <span>{shippingIsFree ? <span className="text-success">Gratuit</span> : formatCurrency(order.shipping_amount || 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total TTC</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Instructions Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Instructions de paiement
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-secondary/50 rounded-lg">
            <p className="font-medium mb-2">Mode de paiement : {order.payment_method}</p>
            <p className="text-sm text-muted-foreground mb-3">
              Conditions : Paiement à {paymentTerms} jours
            </p>

            {order.payment_method === 'Virement bancaire' && (
              <div className="space-y-2 text-sm">
                <p className="font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Coordonnées bancaires
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-muted-foreground pl-6">
                  <span>Banque:</span>
                  <span className="font-medium text-foreground">{bankAccount?.bank_name || settings?.bank_name || '—'}</span>
                  <span>IBAN:</span>
                  <span className="font-medium text-foreground font-mono text-xs">{bankAccount?.iban || settings?.iban || '—'}</span>
                  <span>BIC:</span>
                  <span className="font-medium text-foreground font-mono">{bankAccount?.bic || settings?.bic || '—'}</span>
                  <span>Référence:</span>
                  <span className="font-medium text-foreground">{order.order_number}</span>
                </div>
              </div>
            )}

            {order.payment_method === 'PayPal' && (
              <div className="text-sm">
                <p className="text-muted-foreground">
                  Paiement à effectuer sur: <span className="font-medium text-foreground">{paymentMethod?.config?.email || settings?.paypal_email || settings?.shop_email || '—'}</span>
                </p>
                <p className="text-muted-foreground mt-1">
                  Référence: <span className="font-medium text-foreground">{order.order_number}</span>
                </p>
              </div>
            )}

            {isCryptoPayment && paymentMethod?.config?.wallet_address && (
              <div className="space-y-3 text-sm">
                <p className="font-medium flex items-center gap-2">
                  <Bitcoin className="w-4 h-4" />
                  Paiement en Stablecoins
                </p>
                <p className="text-muted-foreground">
                  Envoyer <span className="font-medium text-foreground">{formatCurrency(order.total, 'USD')}</span> en USDC ou USDT à:
                </p>
                
                {/* QR Code */}
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={paymentMethod.config.wallet_address} 
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                
                {/* Address with copy button */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 bg-background rounded border border-border font-mono text-xs break-all">
                    {paymentMethod.config.wallet_address}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyAddress(paymentMethod.config.wallet_address!)}
                    className="shrink-0"
                  >
                    {copiedAddress ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                
                <p className="text-center text-muted-foreground">
                  Réseau: <span className="font-medium text-foreground capitalize">{paymentMethod.config.network || 'Ethereum'}</span>
                </p>
                <p className="text-muted-foreground">
                  Référence: <span className="font-medium text-foreground">{order.order_number}</span>
                </p>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            Votre commande est en cours de traitement. Vous recevrez votre facture une fois la commande validée.
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF || !settings}
          className="flex-1"
        >
          {isGeneratingPDF ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Télécharger le bon de commande
        </Button>
        
        <Link to="/pro/orders" className="flex-1">
          <Button variant="outline" className="w-full">
            Voir mes commandes
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="text-center">
        <Link to="/pro/catalog" className="text-sm text-muted-foreground hover:text-foreground">
          ← Continuer mes achats
        </Link>
      </div>
    </div>
  );
}