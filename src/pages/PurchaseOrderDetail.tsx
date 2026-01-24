import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePurchaseOrder, useChangePOStatus, poStatusConfig, poAllowedTransitions, POStatus } from "@/hooks/usePurchaseOrders";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { generatePurchaseOrderPDF, downloadPurchaseOrderPDF } from "@/components/pdf/PurchaseOrderPDF";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function PurchaseOrderDetailPage() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { data: po, isLoading, error } = usePurchaseOrder(poId || '');
  const { data: settings } = useSettings();
  const changeStatus = useChangePOStatus();
  const { toast } = useToast();

  const [confirmTransition, setConfirmTransition] = useState<{ to: POStatus; label: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleStatusChange = async (toStatus: POStatus) => {
    if (!poId) return;
    try {
      await changeStatus.mutateAsync({
        id: poId,
        status: toStatus,
      });

      toast({
        title: "Statut mis à jour",
        description: `La commande est maintenant "${poStatusConfig[toStatus].label}"`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    }
    setConfirmTransition(null);
  };

  const handleExportPDF = async () => {
    if (!po || !settings) return;

    setIsExporting(true);
    try {
      const doc = await generatePurchaseOrderPDF({ po, settings });
      downloadPurchaseOrderPDF(doc, po.po_number);
      toast({
        title: "PDF généré",
        description: "Le bon de commande a été téléchargé",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="p-12 text-center">
        <p className="text-destructive mb-4">Commande non trouvée</p>
        <Button variant="outline" onClick={() => navigate("/purchase-orders")}>
          Retour à la liste
        </Button>
      </div>
    );
  }

  const statusConfig = poStatusConfig[po.status];
  const allowedTransitions = poAllowedTransitions[po.status] || [];

  // Calculate totals
  const subtotal = po.purchase_order_items?.reduce(
    (sum, item) => sum + (item.total_cost || 0),
    0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Confirm Transition Dialog */}
      <AlertDialog open={!!confirmTransition} onOpenChange={() => setConfirmTransition(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de statut</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous vraiment passer cette commande au statut "{confirmTransition?.label}" ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmTransition && handleStatusChange(confirmTransition.to)}
              className={confirmTransition?.to === 'cancelled' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/purchase-orders")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{po.po_number}</h1>
            <p className="text-muted-foreground">
              Créée le {formatDate(po.created_at)}
            </p>
          </div>
          <StatusBadge variant={statusConfig.variant}>
            {statusConfig.label}
          </StatusBadge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Exporter PDF
          </Button>
          
          {/* Action Buttons */}
          {allowedTransitions.map((transition) => (
            <Button
              key={transition.to}
              variant={transition.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={() => setConfirmTransition(transition)}
              disabled={changeStatus.isPending}
            >
              {transition.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Document Preview */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden print:shadow-none print:border-0">
        <div className="p-8 max-w-4xl mx-auto">
          {/* Header with Shop Branding */}
          <div className="flex justify-between mb-8">
            <div>
              {settings?.shop_logo_url && (
                <img 
                  src={settings.shop_logo_url} 
                  alt={settings.shop_name} 
                  className="h-16 mb-4 object-contain"
                />
              )}
              <div className="text-sm text-gray-600 space-y-0.5">
                <div className="font-semibold text-gray-900">{settings?.legal_name || settings?.shop_name}</div>
                {settings?.shop_address && <div>{settings.shop_address}</div>}
                <div>
                  {settings?.shop_postal_code} {settings?.shop_city}
                </div>
                {settings?.shop_country && <div>{settings.shop_country}</div>}
                {settings?.shop_phone && <div>Tél : {settings.shop_phone}</div>}
                {settings?.shop_email && <div>Email : {settings.shop_email}</div>}
              </div>
            </div>

            {/* Supplier Info */}
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Fournisseur</div>
              <div className="text-sm space-y-0.5">
                <div className="font-semibold text-gray-900">{po.suppliers?.name}</div>
                {po.suppliers?.address && <div>{po.suppliers.address}</div>}
                <div>
                  {po.suppliers?.postal_code} {po.suppliers?.city}
                </div>
                {po.suppliers?.country && <div>{po.suppliers.country}</div>}
                {po.suppliers?.email && <div>{po.suppliers.email}</div>}
                {po.suppliers?.phone && <div>{po.suppliers.phone}</div>}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">BON DE COMMANDE</h2>
          </div>

          {/* PO Info */}
          <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
            <div>
              <span className="text-gray-500">N° Commande :</span>
              <span className="ml-2 font-medium">{po.po_number}</span>
            </div>
            <div>
              <span className="text-gray-500">Date :</span>
              <span className="ml-2 font-medium">{formatDate(po.order_date || po.created_at)}</span>
            </div>
            <div>
              <span className="text-gray-500">Livraison prévue :</span>
              <span className="ml-2 font-medium">{po.expected_date ? formatDate(po.expected_date) : '—'}</span>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 font-semibold">SKU</th>
                <th className="text-left py-2 font-semibold">Désignation</th>
                <th className="text-center py-2 font-semibold">Qté Commandée</th>
                <th className="text-center py-2 font-semibold">Qté Reçue</th>
                <th className="text-right py-2 font-semibold">Prix unit.</th>
                <th className="text-right py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.purchase_order_items?.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2">{item.sku || '—'}</td>
                  <td className="py-2">{item.title}</td>
                  <td className="py-2 text-center">{item.quantity_ordered}</td>
                  <td className="py-2 text-center">{item.quantity_received || 0}</td>
                  <td className="py-2 text-right">{formatCurrency(item.unit_cost, po.currency || 'EUR')}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(item.total_cost, po.currency || 'EUR')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Sous-total</span>
                <span>{formatCurrency(subtotal, po.currency || 'EUR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Frais de port</span>
                <span>{formatCurrency(po.shipping_cost || 0, po.currency || 'EUR')}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatCurrency(po.total || 0, po.currency || 'EUR')}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {po.notes && (
            <div className="mb-8">
              <div className="text-sm font-semibold text-gray-700 mb-1">Notes</div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">{po.notes}</div>
            </div>
          )}

          {/* Footer with Legal Info */}
          <div className="border-t border-gray-200 pt-6 text-xs text-gray-500 text-center space-y-1">
            <div>
              {settings?.legal_name || settings?.shop_name}
              {settings?.siret && ` • SIRET : ${settings.siret}`}
              {settings?.vat_number && ` • TVA : ${settings.vat_number}`}
            </div>
            {(settings?.iban || settings?.bic) && (
              <div>
                {settings.bank_name && `${settings.bank_name} • `}
                {settings.iban && `IBAN : ${settings.iban}`}
                {settings.bic && ` • BIC : ${settings.bic}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
