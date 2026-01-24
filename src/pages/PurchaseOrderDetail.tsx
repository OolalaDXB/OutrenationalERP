import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileDown, Loader2, Truck, CreditCard, CheckCircle2, Package, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePurchaseOrder, useChangePOStatus, poStatusConfig, poAllowedTransitions, POStatus, carrierLabels, paymentMethodLabels } from "@/hooks/usePurchaseOrders";
import { useSettings } from "@/hooks/useSettings";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { generatePurchaseOrderPDF, downloadPurchaseOrderPDF } from "@/components/pdf/PurchaseOrderPDF";
import { POTrackingModal } from "@/components/purchase-orders/POTrackingModal";
import { POPaymentModal } from "@/components/purchase-orders/POPaymentModal";
import { TrackingTimeline } from "@/components/purchase-orders/TrackingTimeline";
import { getCarrierTrackingUrl } from "@/lib/carrier-tracking-urls";
import { useRefreshTracking, trackingStatusConfig } from "@/hooks/useShip24Tracking";
import { cn } from "@/lib/utils";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function PurchaseOrderDetailPage() {
  const { poId } = useParams<{ poId: string }>();
  const navigate = useNavigate();
  const { data: po, isLoading, error } = usePurchaseOrder(poId || '');
  const { data: settings } = useSettings();
  const changeStatus = useChangePOStatus();
  const refreshTracking = useRefreshTracking();
  const { toast } = useToast();

  const [confirmTransition, setConfirmTransition] = useState<{ to: POStatus; label: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleRefreshTracking = async () => {
    if (!po?.ship24_tracker_id || !poId) return;
    try {
      await refreshTracking.mutateAsync({
        trackerId: po.ship24_tracker_id,
        purchaseOrderId: poId,
      });
      toast({
        title: "Suivi actualisé",
        description: "Les informations de suivi ont été mises à jour",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'actualiser le suivi",
        variant: "destructive",
      });
    }
  };

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
  const isPaid = !!po.paid_at;
  const canRecordPayment = po.status !== 'cancelled' && po.status !== 'closed' && !isPaid;
  // Allow adding tracking from sent, acknowledged, or editing if in_transit
  const canAddTracking = ['sent', 'acknowledged', 'in_transit'].includes(po.status) && !po.tracking_number;
  const canEditTracking = po.status === 'in_transit' && !!po.tracking_number;
  const showReceivedButton = po.status === 'in_transit';

  // Calculate totals
  const subtotal = po.purchase_order_items?.reduce(
    (sum, item) => sum + (item.total_cost || 0),
    0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Modals */}
      {poId && (
        <>
          <POTrackingModal
            open={showTrackingModal}
            onClose={() => setShowTrackingModal(false)}
            poId={poId}
            existingTracking={{
              carrier: po.carrier,
              trackingNumber: po.tracking_number,
              shippedAt: po.shipped_at,
            }}
            currentStatus={po.status}
          />
          <POPaymentModal
            open={showPaymentModal}
            onClose={() => setShowPaymentModal(false)}
            poId={poId}
          />
        </>
      )}

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
      <div className="flex items-center justify-between flex-wrap gap-4">
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
          {isPaid && (
            <StatusBadge variant="success">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Payée
            </StatusBadge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            Exporter PDF
          </Button>
          
          {/* Tracking Button (sent, acknowledged, or edit in_transit) */}
          {canAddTracking && (
            <Button
              variant="default"
              onClick={() => setShowTrackingModal(true)}
              className="gap-2"
            >
              <Truck className="w-4 h-4" />
              Ajouter suivi expédition
            </Button>
          )}

          {/* Received Button (in_transit → received, disabled for Sprint 5-B) */}
          {showReceivedButton && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="default" disabled className="gap-2">
                      <Package className="w-4 h-4" />
                      Marquer reçu
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Réception des marchandises - Sprint 5-B</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
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

      {/* Tracking & Payment Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tracking Card */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Suivi d'expédition
            </h3>
            <div className="flex items-center gap-2">
              {po.tracking_status && (
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  trackingStatusConfig[po.tracking_status]?.color || trackingStatusConfig.unknown.color
                )}>
                  {trackingStatusConfig[po.tracking_status]?.label || po.tracking_status}
                </span>
              )}
              {/* Add/Edit tracking button inside card */}
              {canAddTracking && (
                <Button size="sm" variant="outline" onClick={() => setShowTrackingModal(true)}>
                  Ajouter suivi
                </Button>
              )}
              {canEditTracking && (
                <Button size="sm" variant="ghost" onClick={() => setShowTrackingModal(true)}>
                  Modifier
                </Button>
              )}
            </div>
          </div>
          {po.tracking_number ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transporteur</span>
                <span className="font-medium">{carrierLabels[po.carrier || ''] || po.carrier || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">N° de suivi</span>
                <span className="font-mono font-medium">{po.tracking_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date d'expédition</span>
                <span className="font-medium">{po.shipped_at ? formatDate(po.shipped_at) : '—'}</span>
              </div>
              {/* Track Package Link */}
              <div className="pt-2 border-t border-border">
                <a
                  href={getCarrierTrackingUrl(po.carrier, po.tracking_number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Suivre le colis
                </a>
              </div>

              {/* Ship24 Tracking Timeline */}
              {po.ship24_tracker_id && (
                <div className="pt-3 border-t border-border">
                  <TrackingTimeline
                    events={po.tracking_events as Array<{ status: string; statusCode?: string; location?: string; message?: string; occurredAt: string }> || []}
                    currentStatus={po.tracking_status || undefined}
                    lastUpdate={po.tracking_last_update || undefined}
                    onRefresh={handleRefreshTracking}
                    isRefreshing={refreshTracking.isPending}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun suivi enregistré</p>
          )}
        </div>

        {/* Payment Card */}
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Paiement
            </h3>
            {canRecordPayment && (
              <Button size="sm" variant="outline" onClick={() => setShowPaymentModal(true)}>
                Enregistrer paiement
              </Button>
            )}
          </div>
          {isPaid ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Statut</span>
                <StatusBadge variant="success">Payée le {formatDate(po.paid_at!)}</StatusBadge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode de paiement</span>
                <span className="font-medium">{paymentMethodLabels[po.payment_method || ''] || po.payment_method || '—'}</span>
              </div>
              {po.payment_reference && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Référence</span>
                  <span className="font-mono font-medium">{po.payment_reference}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {po.status === 'cancelled' ? 'Commande annulée' : 'Paiement non enregistré'}
            </p>
          )}
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
