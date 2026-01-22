import { useState, useMemo, useCallback } from "react";
import { X, ShoppingCart, MapPin, Truck, Clock, Package, Pencil, Trash2, Loader2, CreditCard, Copy, FileText, ExternalLink, Printer, RotateCcw, Ban, Edit3, CheckCircle, AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Order, OrderItem } from "@/hooks/useOrders";
import { useCancelOrder, useUpdateOrder, useOrder } from "@/hooks/useOrders";
import { useCancelOrderItem, useReturnOrderItem, useUpdateOrderItemQuantity } from "@/hooks/useOrderItemMutations";
import { useInvoiceForOrder, useCreateInvoiceFromOrder, useCreateInvoiceItems } from "@/hooks/useInvoices";
import { useAuth } from "@/hooks/useAuth";
import { useProducts, Product } from "@/hooks/useProducts";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { getErrorToast } from "@/lib/supabase-errors";
import { OrderEditModal } from "@/components/forms/OrderEditModal";
import { OrderFormModal } from "@/components/forms/OrderFormModal";
import { ProductDrawer } from "@/components/drawers/ProductDrawer";
import { OrderDocumentsDialog } from "@/components/orders/OrderDocumentsDialog";
import { useNavigate } from "react-router-dom";
import { useSettings, getNextCreditNoteNumber } from "@/hooks/useSettings";
import { generateProPurchaseOrderPDF, downloadProPurchaseOrder } from "@/components/pro/ProPurchaseOrderPDF";
import { generateCreditNotePDF, downloadCreditNote } from "@/components/orders/CreditNotePDF";

type OrderWithItems = Order & { order_items?: OrderItem[] };

interface OrderDrawerProps {
  order: OrderWithItems | null;
  isOpen: boolean;
  onClose: () => void;
}

const ORDER_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmée" },
  { value: "processing", label: "En préparation" },
  { value: "shipped", label: "Expédiée" },
  { value: "delivered", label: "Livrée" },
  { value: "cancelled", label: "Annulée" },
  { value: "refunded", label: "Remboursée" },
] as const;

const PAYMENT_STATUSES = [
  { value: "pending", label: "En attente" },
  { value: "paid", label: "Payé" },
  { value: "partial", label: "Partiel" },
  { value: "refunded", label: "Remboursé" },
  { value: "failed", label: "Échoué" },
] as const;

export function OrderDrawer({ order, isOpen, onClose }: OrderDrawerProps) {
  const { canWrite, canDelete } = useAuth();
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const cancelOrder = useCancelOrder();
  const updateOrder = useUpdateOrder();
  const cancelOrderItem = useCancelOrderItem();
  const returnOrderItem = useReturnOrderItem();
  const updateItemQuantity = useUpdateOrderItemQuantity();
  const { data: products = [] } = useProducts();
  
  // Fetch fresh order data to ensure we have latest status after mutations
  const { data: freshOrder } = useOrder(order?.id || '');
  
  // Use fresh data if available, fallback to prop
  const currentOrder = freshOrder || order;
  
  // Invoice hooks
  const { data: existingInvoice, isLoading: isLoadingInvoice } = useInvoiceForOrder(order?.id);
  const createInvoice = useCreateInvoiceFromOrder();
  const createInvoiceItems = useCreateInvoiceItems();
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [showShippedDialog, setShowShippedDialog] = useState(false);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductDrawerOpen, setIsProductDrawerOpen] = useState(false);
  const [isDownloadingPurchaseOrder, setIsDownloadingPurchaseOrder] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  
  // Item action dialogs
  const [itemToCancel, setItemToCancel] = useState<OrderItem | null>(null);
  const [itemToReturn, setItemToReturn] = useState<OrderItem | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [itemToEdit, setItemToEdit] = useState<OrderItem | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);

  // Check if this is a Pro order
  const isProOrder = useMemo(() => currentOrder?.source === "pro_portal", [currentOrder?.source]);

  const handleViewInvoice = () => {
    onClose();
    navigate(`/invoices?search=${currentOrder?.order_number}`);
  };

  const handleProductClick = (productId: string | null) => {
    if (!productId) return;
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setIsProductDrawerOpen(true);
    }
  };

  const handleCloseProductDrawer = () => {
    setIsProductDrawerOpen(false);
    setSelectedProduct(null);
  };

  const handleCancel = async () => {
    if (!currentOrder) return;
    try {
      // Stock restoration is now handled automatically by the database trigger
      // when we cancel the order - the trigger will create sale_reversal movements
      await cancelOrder.mutateAsync({ id: currentOrder.id, reason: "Annulation par l'utilisateur" });
      toast({ title: "Commande annulée", description: `La commande ${currentOrder.order_number} a été annulée. Le stock a été restauré automatiquement.` });
      setShowCancelDialog(false);
    } catch (error) {
      toast(getErrorToast(error));
    }
  };

  // Item-level actions
  const handleCancelItem = async () => {
    if (!itemToCancel || !currentOrder) return;
    try {
      await cancelOrderItem.mutateAsync({ itemId: itemToCancel.id, orderId: currentOrder.id });
      toast({ title: "Article annulé", description: `${itemToCancel.title} a été annulé. Le stock a été restauré.` });
      setItemToCancel(null);
      
      // Check if all items are now cancelled - if so, cancel the entire order
      const remainingItems = currentOrder.order_items?.filter(
        item => item.id !== itemToCancel.id && item.status === 'active'
      );
      
      if (remainingItems?.length === 0) {
        // All items are cancelled, cancel the order too
        await updateOrder.mutateAsync({
          id: currentOrder.id,
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        } as Parameters<typeof updateOrder.mutateAsync>[0]);
        toast({ title: "Commande annulée", description: "Tous les articles ont été annulés, la commande a été annulée automatiquement." });
      }
    } catch (error) {
      toast(getErrorToast(error));
    }
  };

  const handleReturnItem = async () => {
    if (!itemToReturn || !currentOrder || !returnReason.trim()) return;
    try {
      await returnOrderItem.mutateAsync({ itemId: itemToReturn.id, orderId: currentOrder.id, returnReason });
      toast({ title: "Retour enregistré", description: `${itemToReturn.title} a été marqué comme retourné. Le stock a été restauré.` });
      setItemToReturn(null);
      setReturnReason("");
    } catch (error) {
      toast(getErrorToast(error));
    }
  };

  const handleUpdateQuantity = async () => {
    if (!itemToEdit || !currentOrder || editQuantity <= 0) return;
    try {
      await updateItemQuantity.mutateAsync({ 
        itemId: itemToEdit.id, 
        orderId: currentOrder.id, 
        newQuantity: editQuantity,
        unitPrice: itemToEdit.unit_price
      });
      toast({ title: "Quantité mise à jour", description: `Quantité modifiée pour ${itemToEdit.title}.` });
      setItemToEdit(null);
    } catch (error) {
      toast(getErrorToast(error));
    }
  };

  const handleRefund = async () => {
    if (!currentOrder) return;
    try {
      // Generate credit note number
      const creditNoteInfo = await getNextCreditNoteNumber();
      
      await updateOrder.mutateAsync({ 
        id: currentOrder.id, 
        status: "refunded",
        payment_status: "refunded",
        refunded_at: new Date().toISOString()
      } as any);
      
      // Generate and download credit note PDF
      if (settings) {
        const doc = await generateCreditNotePDF({
          order: currentOrder,
          settings,
          creditNoteNumber: creditNoteInfo.full,
          originalInvoiceNumber: currentOrder.order_number
        });
        downloadCreditNote(doc, creditNoteInfo.full);
      }
      
      toast({ 
        title: "Commande remboursée", 
        description: `Avoir ${creditNoteInfo.full} généré pour la commande ${currentOrder.order_number}.` 
      });
      setShowRefundDialog(false);
    } catch (error) {
      console.error('Refund error:', error);
      toast({ title: "Erreur", description: "Impossible de rembourser la commande.", variant: "destructive" });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!currentOrder) return;
    
    // Show confirmation for cancelled/refunded
    if (newStatus === "cancelled") {
      setShowCancelDialog(true);
      return;
    }
    if (newStatus === "refunded") {
      setShowRefundDialog(true);
      return;
    }
    // Show tracking input dialog for shipped
    if (newStatus === "shipped") {
      setTrackingNumber(currentOrder.tracking_number || "");
      setTrackingUrl(currentOrder.tracking_url || "");
      setShowShippedDialog(true);
      return;
    }

    try {
      const updateData: Record<string, unknown> = { id: currentOrder.id, status: newStatus };
      
      // Add timestamps based on status
      if (newStatus === "confirmed") {
        updateData.confirmed_at = new Date().toISOString();
      } else if (newStatus === "processing") {
        updateData.processing_at = new Date().toISOString();
      } else if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      await updateOrder.mutateAsync(updateData as Parameters<typeof updateOrder.mutateAsync>[0]);
      toast({ title: "Statut mis à jour", description: `Commande passée en "${ORDER_STATUSES.find(s => s.value === newStatus)?.label}"` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    }
  };

  const handleShipOrder = async () => {
    if (!currentOrder) return;
    try {
      await updateOrder.mutateAsync({
        id: currentOrder.id,
        status: "shipped",
        shipped_at: new Date().toISOString(),
        tracking_number: trackingNumber || null,
        tracking_url: trackingUrl || null
      } as Parameters<typeof updateOrder.mutateAsync>[0]);
      toast({ title: "Commande expédiée", description: `La commande ${currentOrder.order_number} a été marquée comme expédiée.` });
      setShowShippedDialog(false);
      setTrackingNumber("");
      setTrackingUrl("");
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    }
  };

  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!currentOrder) return;
    try {
      const updateData: Record<string, unknown> = { id: currentOrder.id, payment_status: newStatus };
      
      if (newStatus === "paid") {
        updateData.paid_at = new Date().toISOString();
      }

      await updateOrder.mutateAsync(updateData as Parameters<typeof updateOrder.mutateAsync>[0]);
      toast({ title: "Paiement mis à jour", description: `Statut de paiement: "${PAYMENT_STATUSES.find(s => s.value === newStatus)?.label}"` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le paiement.", variant: "destructive" });
    }
  };

  // Quick action: Validate order (set to confirmed)
  const handleQuickConfirm = async () => {
    if (!currentOrder) return;
    try {
      await updateOrder.mutateAsync({ 
        id: currentOrder.id, 
        status: "confirmed",
        confirmed_at: new Date().toISOString()
      } as Parameters<typeof updateOrder.mutateAsync>[0]);
      toast({ title: "Commande validée", description: `La commande ${currentOrder.order_number} a été confirmée.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de valider la commande.", variant: "destructive" });
    }
  };

  // Quick action: Mark as paid
  const handleQuickMarkPaid = async () => {
    if (!currentOrder) return;
    try {
      await updateOrder.mutateAsync({ 
        id: currentOrder.id, 
        payment_status: "paid", 
        paid_at: new Date().toISOString() 
      } as Parameters<typeof updateOrder.mutateAsync>[0]);
      toast({ title: "Paiement confirmé", description: `La commande ${currentOrder.order_number} a été marquée comme payée.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le paiement.", variant: "destructive" });
    }
  };

  // Download Pro Purchase Order PDF
  const handleDownloadPurchaseOrder = async () => {
    if (!currentOrder || !settings) return;
    
    setIsDownloadingPurchaseOrder(true);
    try {
      const orderData = {
        id: currentOrder.id,
        order_number: currentOrder.order_number,
        created_at: currentOrder.created_at,
        customer_name: currentOrder.customer_name,
        customer_email: currentOrder.customer_email,
        shipping_address: currentOrder.shipping_address,
        shipping_address_line_2: currentOrder.shipping_address_line_2,
        shipping_city: currentOrder.shipping_city,
        shipping_postal_code: currentOrder.shipping_postal_code,
        shipping_country: currentOrder.shipping_country,
        subtotal: currentOrder.subtotal,
        discount_amount: currentOrder.discount_amount,
        tax_amount: currentOrder.tax_amount,
        shipping_amount: currentOrder.shipping_amount,
        total: currentOrder.total,
        payment_method: currentOrder.payment_method,
        order_items: (currentOrder.order_items || []).map((item) => ({
          title: item.title,
          artist_name: item.artist_name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
        })),
      };

      const doc = await generateProPurchaseOrderPDF({
        order: orderData,
        settings,
        vatLabel: "TVA (20%)",
        paymentTerms: "30",
      });
      downloadProPurchaseOrder(doc, currentOrder.order_number);
      toast({ title: "Téléchargé", description: `bon-de-commande-${currentOrder.order_number}.pdf` });
    } catch (error) {
      console.error("Error generating purchase order:", error);
      toast({ title: "Erreur", description: "Impossible de générer le bon de commande.", variant: "destructive" });
    } finally {
      setIsDownloadingPurchaseOrder(false);
    }
  };

  // Generate invoice from order
  const handleGenerateInvoice = async () => {
    if (!currentOrder) return;
    
    setIsGeneratingInvoice(true);
    try {
      // Build shipping address
      const addressParts = [
        currentOrder.shipping_address,
        currentOrder.shipping_address_line_2,
        currentOrder.shipping_postal_code,
        currentOrder.shipping_city,
        currentOrder.shipping_country
      ].filter(Boolean);
      
      // Create the invoice
      const invoice = await createInvoice.mutateAsync({
        orderId: currentOrder.id,
        customerId: currentOrder.customer_id,
        recipientName: currentOrder.customer_name || currentOrder.customer_email,
        recipientEmail: currentOrder.customer_email,
        recipientAddress: addressParts.join(', '),
        subtotal: currentOrder.subtotal,
        taxAmount: currentOrder.tax_amount,
        total: currentOrder.total,
        currency: currentOrder.currency
      });
      
      // Create invoice items from active order items
      const activeItems = (currentOrder.order_items || []).filter(item => item.status === 'active');
      if (activeItems.length > 0) {
        await createInvoiceItems.mutateAsync({
          invoiceId: invoice.id,
          items: activeItems.map(item => ({
            description: `${item.title}${item.artist_name ? ` - ${item.artist_name}` : ''}`,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            product_id: item.product_id
          }))
        });
      }
      
      toast({ 
        title: "Facture créée", 
        description: `Facture ${invoice.invoice_number} créée avec succès.` 
      });
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({ title: "Erreur", description: "Impossible de générer la facture.", variant: "destructive" });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  if (!isOpen || !order) return null;

  const timeline = [
    { status: "pending", label: "Commande reçue", date: currentOrder.created_at, active: true },
    { status: "processing", label: "En préparation", date: currentOrder.status !== "pending" ? currentOrder.created_at : null, active: currentOrder.status !== "pending" && currentOrder.status !== "cancelled" },
    { status: "shipped", label: "Expédiée", date: currentOrder.shipped_at || (currentOrder.tracking_number ? currentOrder.created_at : null), active: currentOrder.status === "shipped" || currentOrder.status === "delivered" },
    { status: "delivered", label: "Livrée", date: currentOrder.delivered_at || (currentOrder.status === "delivered" ? currentOrder.created_at : null), active: currentOrder.status === "delivered" },
  ];

  const customerInitials = currentOrder.customer_name 
    ? currentOrder.customer_name.split(' ').map(n => n[0]).join('')
    : currentOrder.customer_email[0].toUpperCase();

  const shippingAddress = [
    currentOrder.shipping_address,
    currentOrder.shipping_address_line_2,
    currentOrder.shipping_city,
    currentOrder.shipping_postal_code,
    currentOrder.shipping_country
  ].filter(Boolean).join(', ');

  const canModifyOrder = currentOrder.status !== "cancelled" && currentOrder.status !== "refunded" && currentOrder.status !== "delivered";
  const isUpdating = updateOrder.isPending || cancelOrder.isPending || isGeneratingInvoice;
  
  // Show quick actions only if order can be confirmed or marked as paid
  const canQuickConfirm = currentOrder.status === "pending";
  const canQuickMarkPaid = currentOrder.payment_status === "pending" && currentOrder.status !== "cancelled" && currentOrder.status !== "refunded";
  const canGenerateInvoice = !existingInvoice && !isLoadingInvoice && currentOrder.status !== "cancelled";

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div 
          className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">Commande {currentOrder.order_number}</h2>
                  {isProOrder && (
                    <span className="inline-flex items-center bg-violet-100 text-violet-700 border border-violet-300 text-[10px] px-1.5 py-0.5 rounded font-semibold">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{formatDateTime(currentOrder.created_at)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Refund Request Alert */}
            {(currentOrder as any).refund_requested && currentOrder.status !== 'refunded' && canWrite() && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-warning-foreground">
                      Demande de remboursement reçue
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(currentOrder as any).refund_requested_at && (
                        <>Le {new Date((currentOrder as any).refund_requested_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </p>
                    {(currentOrder as any).refund_reason && (
                      <p className="text-sm mt-2 bg-background/50 rounded p-2 italic">
                        "{(currentOrder as any).refund_reason}"
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={async () => {
                          try {
                            // Generate credit note number
                            const creditNoteInfo = await getNextCreditNoteNumber();
                            
                            // Update order status
                            await updateOrder.mutateAsync({
                              id: currentOrder.id,
                              status: 'refunded',
                              payment_status: 'refunded',
                              refunded_at: new Date().toISOString()
                            } as any);
                            
                            // Generate and download credit note PDF
                            if (settings) {
                              const doc = await generateCreditNotePDF({
                                order: currentOrder,
                                settings,
                                creditNoteNumber: creditNoteInfo.full,
                                originalInvoiceNumber: currentOrder.order_number
                              });
                              downloadCreditNote(doc, creditNoteInfo.full);
                            }
                            
                            toast({ 
                              title: "Remboursement effectué", 
                              description: `Avoir ${creditNoteInfo.full} généré pour la commande ${currentOrder.order_number}.` 
                            });
                          } catch (error) {
                            console.error('Refund error:', error);
                            toast({ title: "Erreur", description: "Impossible de traiter le remboursement.", variant: "destructive" });
                          }
                        }}
                        disabled={isUpdating}
                      >
                        <RefreshCcw className="w-4 h-4 mr-1" />
                        Accepter le remboursement
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await updateOrder.mutateAsync({
                              id: currentOrder.id,
                              refund_requested: false,
                              refund_reason: null
                            } as any);
                            toast({ title: "Demande refusée", description: "La demande de remboursement a été refusée." });
                          } catch (error) {
                            toast({ title: "Erreur", description: "Impossible de refuser la demande.", variant: "destructive" });
                          }
                        }}
                        disabled={isUpdating}
                      >
                        Refuser
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Management */}
            {canWrite() && (
              <div className="bg-secondary rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground block">Statut commande</Label>
                    <Select 
                      value={currentOrder.status || "pending"} 
                      onValueChange={handleStatusChange}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground block">
                      <CreditCard className="w-3 h-3 inline-block mr-1" />
                      Statut paiement
                    </Label>
                    <Select 
                      value={currentOrder.payment_status || "pending"}
                      onValueChange={handlePaymentStatusChange}
                      disabled={isUpdating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_STATUSES.map(status => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {isUpdating && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mise à jour en cours...
                  </div>
                )}
                
                {/* Quick Actions */}
                {(canQuickConfirm || canQuickMarkPaid || canGenerateInvoice) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    {canQuickConfirm && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={handleQuickConfirm}
                        disabled={isUpdating}
                        className="flex-1 min-w-[120px]"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Valider commande
                      </Button>
                    )}
                    {canQuickMarkPaid && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleQuickMarkPaid}
                        disabled={isUpdating}
                        className="flex-1 min-w-[120px]"
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Marquer payé
                      </Button>
                    )}
                    {canGenerateInvoice && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={handleGenerateInvoice}
                        disabled={isUpdating || isGeneratingInvoice}
                        className="flex-1 min-w-[120px]"
                      >
                        {isGeneratingInvoice ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <FileText className="w-4 h-4 mr-1" />
                        )}
                        Générer facture
                      </Button>
                    )}
                  </div>
                )}
                {existingInvoice && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>Facture: <button onClick={handleViewInvoice} className="text-primary hover:underline font-medium">{existingInvoice.invoice_number}</button></span>
                  </div>
                )}
              </div>
            )}

            {/* Current Status Display (for read-only users) */}
            {!canWrite() && (
              <div className="flex items-center justify-between">
                {currentOrder.status && (
                  <StatusBadge variant={orderStatusVariant[currentOrder.status]}>
                    {orderStatusLabel[currentOrder.status]}
                  </StatusBadge>
                )}
                {currentOrder.payment_status === "paid" && (
                  <span className="text-sm text-success font-medium">Payé</span>
                )}
                {currentOrder.payment_status === "refunded" && (
                  <span className="text-sm text-danger font-medium">Remboursé</span>
                )}
              </div>
            )}

            {/* Customer */}
            <div className="bg-secondary rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                  {customerInitials}
                </div>
                <div>
                  <div className="font-medium">{currentOrder.customer_name || '—'}</div>
                  <div className="text-sm text-muted-foreground">{currentOrder.customer_email}</div>
                </div>
              </div>
              {shippingAddress && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{shippingAddress}</span>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Suivi
              </h3>
              <div className="space-y-3">
                {timeline.map((step) => (
                  <div key={step.status} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${step.active ? 'bg-success' : 'bg-border'}`} />
                    <div className="flex-1">
                      <div className={`text-sm ${step.active ? 'font-medium' : 'text-muted-foreground'}`}>
                        {step.label}
                      </div>
                    </div>
                    {step.date && step.active && (
                      <div className="text-xs text-muted-foreground">{formatDateTime(step.date)}</div>
                    )}
                  </div>
                ))}
              </div>
              {currentOrder.tracking_number && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Suivi :</span>
                  <span className="font-mono text-primary">{currentOrder.tracking_number}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Articles ({currentOrder.order_items?.length || 0})
              </h3>
              <div className="space-y-3">
                {currentOrder.order_items?.map((item) => {
                  const isItemActive = item.status === 'active';
                  const isItemCancelled = item.status === 'cancelled';
                  const isItemReturned = item.status === 'returned';
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`p-3 bg-secondary rounded-lg transition-colors ${
                        isItemCancelled || isItemReturned ? 'opacity-60' : ''
                      }`}
                    >
                      <div 
                        className={`flex items-center gap-3 ${
                          item.product_id ? 'cursor-pointer hover:bg-secondary/80 rounded-lg -m-1 p-1' : ''
                        }`}
                        onClick={() => handleProductClick(item.product_id)}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center flex-shrink-0">
                            <span className="text-[0.5rem] text-muted-foreground/50">VINYL</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm truncate ${item.product_id ? 'text-primary hover:underline' : ''}`}>
                            {item.title}
                          </div>
                          <div className="text-xs text-muted-foreground">{item.artist_name || '—'}</div>
                          {/* Status badges */}
                          {isItemCancelled && (
                            <span className="inline-flex items-center gap-1 text-xs text-destructive mt-1">
                              <Ban className="w-3 h-3" />
                              Annulé {item.cancelled_at && `le ${new Date(item.cancelled_at).toLocaleDateString('fr-FR')}`}
                            </span>
                          )}
                          {isItemReturned && (
                            <span className="inline-flex items-center gap-1 text-xs text-warning mt-1">
                              <RotateCcw className="w-3 h-3" />
                              Retourné {item.returned_at && `le ${new Date(item.returned_at).toLocaleDateString('fr-FR')}`}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`font-medium text-sm ${isItemCancelled || isItemReturned ? 'line-through' : ''}`}>
                            {formatCurrency(item.unit_price * item.quantity)}
                          </div>
                          <div className="text-xs text-muted-foreground">×{item.quantity}</div>
                        </div>
                      </div>
                      
                      {/* Item Actions (staff/admin only, active items only) */}
                      {canWrite() && isItemActive && canModifyOrder && (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 h-7 text-xs"
                            onClick={() => {
                              setItemToEdit(item);
                              setEditQuantity(item.quantity);
                            }}
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Modifier qté
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 h-7 text-xs text-warning hover:text-warning"
                            onClick={() => setItemToReturn(item)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Retour
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-1 h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => setItemToCancel(item)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            Annuler
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatCurrency(currentOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Livraison</span>
                <span>{formatCurrency(currentOrder.shipping_amount)}</span>
              </div>
              {(currentOrder.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Remise</span>
                  <span>-{formatCurrency(currentOrder.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatCurrency(currentOrder.total)}</span>
              </div>
            </div>

            {/* Documents Link */}
            <div className="pt-4 border-t border-border space-y-2">
              <Button variant="default" className="w-full" onClick={() => setShowDocumentsDialog(true)}>
                <Printer className="w-4 h-4 mr-2" />
                Documents (Bordereau)
              </Button>
              {!isProOrder && existingInvoice && (
                <Button variant="secondary" className="w-full" onClick={handleViewInvoice}>
                  <FileText className="w-4 h-4 mr-2" />
                  Voir facture dans la liste
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              )}
            </div>

            {/* Edit/Duplicate/Cancel Actions */}
            {canWrite() && (
              <div className="flex gap-3">
                {canModifyOrder && (
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => setShowDuplicateModal(true)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Dupliquer
                </Button>
                {canDelete() && canModifyOrder && (
                  <Button variant="destructive" className="flex-1" onClick={() => setShowCancelDialog(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Annuler
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action annulera la commande "{currentOrder.order_number}". Le stock sera restauré.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Annuler la commande
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Confirmation Dialog */}
      <AlertDialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rembourser la commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action marquera la commande "{currentOrder.order_number}" comme remboursée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction onClick={handleRefund} className="bg-warning text-warning-foreground hover:bg-warning/90">
              Rembourser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Shipped Dialog with Tracking Number */}
      <Dialog open={showShippedDialog} onOpenChange={setShowShippedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Marquer comme expédiée
            </DialogTitle>
            <DialogDescription>
              Ajoutez les informations de suivi pour la commande "{currentOrder.order_number}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Numéro de suivi (optionnel)</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Ex: 1Z999AA10123456784"
              />
            </div>
            <div className="space-y-2">
              <Label>URL de suivi (optionnel)</Label>
              <Input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="Ex: https://www.ups.com/track?loc=fr_FR&tracknum=..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShippedDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleShipOrder} disabled={updateOrder.isPending}>
              {updateOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer l'expédition
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      {showEditModal && (
        <OrderEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          order={currentOrder}
        />
      )}

      {/* Duplicate Order Modal */}
      {showDuplicateModal && (
        <OrderFormModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          duplicateFrom={currentOrder}
        />
      )}

      {/* Product Drawer */}
      <ProductDrawer
        product={selectedProduct}
        isOpen={isProductDrawerOpen}
        onClose={handleCloseProductDrawer}
      />

      {/* Order Documents Dialog */}
      {showDocumentsDialog && (
        <OrderDocumentsDialog
          order={currentOrder}
          isOpen={showDocumentsDialog}
          onClose={() => setShowDocumentsDialog(false)}
        />
      )}

      {/* Cancel Item Dialog */}
      <AlertDialog open={!!itemToCancel} onOpenChange={(open) => !open && setItemToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cet article ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'article "{itemToCancel?.title}" sera annulé et le stock sera restauré automatiquement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelItem} 
              disabled={cancelOrderItem.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelOrderItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Annuler l'article
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Return Item Dialog */}
      <Dialog open={!!itemToReturn} onOpenChange={(open) => { if (!open) { setItemToReturn(null); setReturnReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Retour article
            </DialogTitle>
            <DialogDescription>
              Enregistrer le retour de "{itemToReturn?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Motif du retour *</Label>
              <Textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Ex: Article défectueux, erreur de commande..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setItemToReturn(null); setReturnReason(""); }}>
              Annuler
            </Button>
            <Button 
              onClick={handleReturnItem} 
              disabled={returnOrderItem.isPending || !returnReason.trim()}
            >
              {returnOrderItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer le retour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Quantity Dialog */}
      <Dialog open={!!itemToEdit} onOpenChange={(open) => !open && setItemToEdit(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Modifier la quantité
            </DialogTitle>
            <DialogDescription>
              Modifier la quantité pour "{itemToEdit?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nouvelle quantité</Label>
              <Input
                type="number"
                min={1}
                value={editQuantity}
                onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
              {itemToEdit && editQuantity !== itemToEdit.quantity && (
                <p className="text-xs text-muted-foreground">
                  Nouveau total : {formatCurrency(editQuantity * itemToEdit.unit_price)}
                  {editQuantity > itemToEdit.quantity 
                    ? ` (stock -${editQuantity - itemToEdit.quantity})`
                    : ` (stock +${itemToEdit.quantity - editQuantity})`
                  }
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemToEdit(null)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdateQuantity} 
              disabled={updateItemQuantity.isPending || editQuantity <= 0 || (itemToEdit && editQuantity === itemToEdit.quantity)}
            >
              {updateItemQuantity.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
