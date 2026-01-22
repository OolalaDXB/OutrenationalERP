import { useState, useMemo } from "react";
import { X, ShoppingCart, MapPin, Truck, Clock, Package, Pencil, Trash2, Loader2, CreditCard, Copy, FileText, ExternalLink, Printer, RotateCcw, Ban, Edit3, CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Order, OrderItem } from "@/hooks/useOrders";
import { useCancelOrder, useUpdateOrder } from "@/hooks/useOrders";
import { useCancelOrderItem, useReturnOrderItem, useUpdateOrderItemQuantity } from "@/hooks/useOrderItemMutations";
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
import { useSettings } from "@/hooks/useSettings";
import { generateProPurchaseOrderPDF, downloadProPurchaseOrder } from "@/components/pro/ProPurchaseOrderPDF";

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
  
  // Item action dialogs
  const [itemToCancel, setItemToCancel] = useState<OrderItem | null>(null);
  const [itemToReturn, setItemToReturn] = useState<OrderItem | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [itemToEdit, setItemToEdit] = useState<OrderItem | null>(null);
  const [editQuantity, setEditQuantity] = useState(1);

  // Check if this is a Pro order
  const isProOrder = useMemo(() => order?.source === "pro_portal", [order?.source]);

  const handleViewInvoice = () => {
    onClose();
    navigate(`/invoices?search=${order?.order_number}`);
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
    if (!order) return;
    try {
      // Stock restoration is now handled automatically by the database trigger
      // when we cancel the order - the trigger will create sale_reversal movements
      await cancelOrder.mutateAsync({ id: order.id, reason: "Annulation par l'utilisateur" });
      toast({ title: "Commande annulée", description: `La commande ${order.order_number} a été annulée. Le stock a été restauré automatiquement.` });
      setShowCancelDialog(false);
    } catch (error) {
      toast(getErrorToast(error));
    }
  };

  // Item-level actions
  const handleCancelItem = async () => {
    if (!itemToCancel || !order) return;
    try {
      await cancelOrderItem.mutateAsync({ itemId: itemToCancel.id, orderId: order.id });
      toast({ title: "Article annulé", description: `${itemToCancel.title} a été annulé. Le stock a été restauré.` });
      setItemToCancel(null);
    } catch (error) {
      toast(getErrorToast(error));
    }
  };

  const handleReturnItem = async () => {
    if (!itemToReturn || !order || !returnReason.trim()) return;
    try {
      await returnOrderItem.mutateAsync({ itemId: itemToReturn.id, orderId: order.id, returnReason });
      toast({ title: "Retour enregistré", description: `${itemToReturn.title} a été marqué comme retourné. Le stock a été restauré.` });
      setItemToReturn(null);
      setReturnReason("");
    } catch (error) {
      toast(getErrorToast(error));
    }
  };

  const handleUpdateQuantity = async () => {
    if (!itemToEdit || !order || editQuantity <= 0) return;
    try {
      await updateItemQuantity.mutateAsync({ 
        itemId: itemToEdit.id, 
        orderId: order.id, 
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
    if (!order) return;
    try {
      await updateOrder.mutateAsync({ 
        id: order.id, 
        status: "refunded",
        payment_status: "refunded"
      });
      toast({ title: "Commande remboursée", description: `La commande ${order.order_number} a été remboursée.` });
      setShowRefundDialog(false);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de rembourser la commande.", variant: "destructive" });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    
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
      setTrackingNumber(order.tracking_number || "");
      setTrackingUrl(order.tracking_url || "");
      setShowShippedDialog(true);
      return;
    }

    try {
      const updateData: Record<string, unknown> = { id: order.id, status: newStatus };
      
      // Add timestamps
      if (newStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      await updateOrder.mutateAsync(updateData as Parameters<typeof updateOrder.mutateAsync>[0]);
      toast({ title: "Statut mis à jour", description: `Commande passée en "${ORDER_STATUSES.find(s => s.value === newStatus)?.label}"` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    }
  };

  const handleShipOrder = async () => {
    if (!order) return;
    try {
      await updateOrder.mutateAsync({
        id: order.id,
        status: "shipped",
        shipped_at: new Date().toISOString(),
        tracking_number: trackingNumber || null,
        tracking_url: trackingUrl || null
      } as Parameters<typeof updateOrder.mutateAsync>[0]);
      toast({ title: "Commande expédiée", description: `La commande ${order.order_number} a été marquée comme expédiée.` });
      setShowShippedDialog(false);
      setTrackingNumber("");
      setTrackingUrl("");
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le statut.", variant: "destructive" });
    }
  };

  const handlePaymentStatusChange = async (newStatus: string) => {
    if (!order) return;
    try {
      const updateData: Record<string, unknown> = { id: order.id, payment_status: newStatus };
      
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
    if (!order) return;
    try {
      await updateOrder.mutateAsync({ id: order.id, status: "confirmed" } as Parameters<typeof updateOrder.mutateAsync>[0]);
      toast({ title: "Commande validée", description: `La commande ${order.order_number} a été confirmée.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de valider la commande.", variant: "destructive" });
    }
  };

  // Quick action: Mark as paid
  const handleQuickMarkPaid = async () => {
    if (!order) return;
    try {
      await updateOrder.mutateAsync({ 
        id: order.id, 
        payment_status: "paid", 
        paid_at: new Date().toISOString() 
      } as Parameters<typeof updateOrder.mutateAsync>[0]);
      toast({ title: "Paiement confirmé", description: `La commande ${order.order_number} a été marquée comme payée.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le paiement.", variant: "destructive" });
    }
  };

  // Download Pro Purchase Order PDF
  const handleDownloadPurchaseOrder = async () => {
    if (!order || !settings) return;
    
    setIsDownloadingPurchaseOrder(true);
    try {
      const orderData = {
        id: order.id,
        order_number: order.order_number,
        created_at: order.created_at,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        shipping_address: order.shipping_address,
        shipping_address_line_2: order.shipping_address_line_2,
        shipping_city: order.shipping_city,
        shipping_postal_code: order.shipping_postal_code,
        shipping_country: order.shipping_country,
        subtotal: order.subtotal,
        discount_amount: order.discount_amount,
        tax_amount: order.tax_amount,
        shipping_amount: order.shipping_amount,
        total: order.total,
        payment_method: order.payment_method,
        order_items: (order.order_items || []).map((item) => ({
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
      downloadProPurchaseOrder(doc, order.order_number);
      toast({ title: "Téléchargé", description: `bon-de-commande-${order.order_number}.pdf` });
    } catch (error) {
      console.error("Error generating purchase order:", error);
      toast({ title: "Erreur", description: "Impossible de générer le bon de commande.", variant: "destructive" });
    } finally {
      setIsDownloadingPurchaseOrder(false);
    }
  };

  if (!isOpen || !order) return null;

  const timeline = [
    { status: "pending", label: "Commande reçue", date: order.created_at, active: true },
    { status: "processing", label: "En préparation", date: order.status !== "pending" ? order.created_at : null, active: order.status !== "pending" && order.status !== "cancelled" },
    { status: "shipped", label: "Expédiée", date: order.shipped_at || (order.tracking_number ? order.created_at : null), active: order.status === "shipped" || order.status === "delivered" },
    { status: "delivered", label: "Livrée", date: order.delivered_at || (order.status === "delivered" ? order.created_at : null), active: order.status === "delivered" },
  ];

  const customerInitials = order.customer_name 
    ? order.customer_name.split(' ').map(n => n[0]).join('')
    : order.customer_email[0].toUpperCase();

  const shippingAddress = [
    order.shipping_address,
    order.shipping_address_line_2,
    order.shipping_city,
    order.shipping_postal_code,
    order.shipping_country
  ].filter(Boolean).join(', ');

  const canModifyOrder = order.status !== "cancelled" && order.status !== "refunded" && order.status !== "delivered";
  const isUpdating = updateOrder.isPending || cancelOrder.isPending;
  
  // Show quick actions only if order can be confirmed or marked as paid
  const canQuickConfirm = order.status === "pending" && canModifyOrder;
  const canQuickMarkPaid = order.payment_status === "pending" && canModifyOrder;

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Commande {order.order_number}</h2>
                <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Status Management */}
            {canWrite() && (
              <div className="bg-secondary rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Statut commande</Label>
                    <Select 
                      value={order.status || "pending"} 
                      onValueChange={handleStatusChange}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="mt-1.5">
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
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      Statut paiement
                    </Label>
                    <Select 
                      value={order.payment_status || "pending"} 
                      onValueChange={handlePaymentStatusChange}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="mt-1.5">
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
                {(canQuickConfirm || canQuickMarkPaid) && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    {canQuickConfirm && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={handleQuickConfirm}
                        disabled={isUpdating}
                        className="flex-1"
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
                        className="flex-1"
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Marquer payé
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Current Status Display (for read-only users) */}
            {!canWrite() && (
              <div className="flex items-center justify-between">
                {order.status && (
                  <StatusBadge variant={orderStatusVariant[order.status]}>
                    {orderStatusLabel[order.status]}
                  </StatusBadge>
                )}
                {order.payment_status === "paid" && (
                  <span className="text-sm text-success font-medium">Payé</span>
                )}
                {order.payment_status === "refunded" && (
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
                  <div className="font-medium">{order.customer_name || '—'}</div>
                  <div className="text-sm text-muted-foreground">{order.customer_email}</div>
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
              {order.tracking_number && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Suivi :</span>
                  <span className="font-mono text-primary">{order.tracking_number}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Articles ({order.order_items?.length || 0})
              </h3>
              <div className="space-y-3">
                {order.order_items?.map((item) => {
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
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Livraison</span>
                <span>{formatCurrency(order.shipping_amount)}</span>
              </div>
              {(order.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Remise</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Invoice & Documents Link */}
            <div className="pt-4 border-t border-border space-y-2">
              {/* Direct Purchase Order download for Pro orders */}
              {isProOrder && (
                <Button 
                  variant="default" 
                  className="w-full" 
                  onClick={handleDownloadPurchaseOrder}
                  disabled={!settings || isDownloadingPurchaseOrder}
                >
                  {isDownloadingPurchaseOrder ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Télécharger le bon de commande
                </Button>
              )}
              <Button variant={isProOrder ? "outline" : "default"} className="w-full" onClick={() => setShowDocumentsDialog(true)}>
                <Printer className="w-4 h-4 mr-2" />
                {isProOrder ? "Documents (Bordereau)" : "Facture & Bordereau"}
              </Button>
              {!isProOrder && (
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
              Cette action annulera la commande "{order.order_number}". Le stock sera restauré.
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
              Cette action marquera la commande "{order.order_number}" comme remboursée.
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
              Ajoutez les informations de suivi pour la commande "{order.order_number}"
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
          order={order}
        />
      )}

      {/* Duplicate Order Modal */}
      {showDuplicateModal && (
        <OrderFormModal
          isOpen={showDuplicateModal}
          onClose={() => setShowDuplicateModal(false)}
          duplicateFrom={order}
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
          order={order}
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
