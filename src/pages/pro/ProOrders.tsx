import { useState, useEffect, useRef, useMemo } from "react";
import { FileText, Package, Loader2, ChevronDown, ChevronUp, Download, XCircle, RefreshCcw, Clock, Mail, Truck, CheckCircle, Ban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { generateProPurchaseOrderPDF, downloadProPurchaseOrder } from "@/components/pro/ProPurchaseOrderPDF";
import { StatusBadge, orderStatusVariant, orderStatusLabel, paymentStatusVariant, paymentStatusLabel } from "@/components/ui/status-badge";
import { OrderProgressTracker } from "@/components/pro/OrderProgressTracker";
import { useProAuth } from "@/hooks/useProAuth";
import { useSettings } from "@/hooks/useSettings";
import { useCancelProOrder, useRequestRefund } from "@/hooks/useProOrders";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProOrders() {
  const { customer } = useProAuth();
  const { data: settings } = useSettings();
  const queryClient = useQueryClient();
  const cancelOrder = useCancelProOrder();
  const requestRefund = useRequestRefund();
  
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [cancelDialogOrder, setCancelDialogOrder] = useState<any | null>(null);
  const [refundDialogOrder, setRefundDialogOrder] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const isInitialMount = useRef(true);

  // Fetch customer's orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['pro_orders_full', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id
  });

  // Real-time subscription for order updates
  useEffect(() => {
    if (!customer?.id) return;

    const channel = supabase
      .channel('pro-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `customer_id=eq.${customer.id}`
        },
        (payload) => {
          if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
          }
          
          const newStatus = payload.new?.status;
          const orderNumber = payload.new?.order_number;
          
          if (newStatus && orderNumber) {
            const statusLabel = orderStatusLabel[newStatus as keyof typeof orderStatusLabel] || newStatus;
            toast.success(`Commande ${orderNumber}`, {
              description: `Statut mis à jour : ${statusLabel}`,
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ['pro_orders_full', customer.id] });
        }
      )
      .subscribe();

    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 1000);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [customer?.id, queryClient]);

  // Handle cancel order
  const handleCancelOrder = async () => {
    if (!cancelDialogOrder || !customer?.id) return;
    
    try {
      await cancelOrder.mutateAsync({ 
        orderId: cancelDialogOrder.id, 
        customerId: customer.id 
      });
      toast.success("Commande annulée");
      setCancelDialogOrder(null);
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    }
  };

  // Handle refund request
  const handleRequestRefund = async () => {
    if (!refundDialogOrder || !customer?.id || !refundReason.trim()) return;
    
    try {
      await requestRefund.mutateAsync({ 
        orderId: refundDialogOrder.id, 
        customerId: customer.id,
        reason: refundReason.trim()
      });
      toast.success("Demande envoyée", {
        description: "Notre équipe vous contactera sous 48h."
      });
      setRefundDialogOrder(null);
      setRefundReason("");
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    }
  };

  // Check if refund can be requested (within 14 days of delivery)
  const canRequestRefund = (order: any) => {
    if (order.status !== 'delivered' || order.refund_requested) return false;
    if (!order.delivered_at) return false;
    
    const deliveredDate = new Date(order.delivered_at);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    return deliveredDate >= fourteenDaysAgo;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mes commandes</h1>
        <p className="text-muted-foreground">{orders.length} commande(s)</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Aucune commande</h2>
          <p className="text-muted-foreground">
            Vous n'avez pas encore passé de commande.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isExpanded = expandedOrderId === order.id;
            const items = order.order_items || [];
            const canCancel = order.status === 'pending';
            const canRefund = canRequestRefund(order);
            const needsContact = order.status === 'confirmed' || order.status === 'processing';

            return (
              <div 
                key={order.id}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Order header */}
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors text-left"
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(order.created_at)} • {items.length} article(s)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right space-y-1">
                      <p className="font-semibold">{formatCurrency(order.total)}</p>
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        {order.status && (
                          <StatusBadge variant={orderStatusVariant[order.status]}>
                            {orderStatusLabel[order.status]}
                          </StatusBadge>
                        )}
                        {order.payment_status && (
                          <StatusBadge variant={paymentStatusVariant[order.payment_status]}>
                            {paymentStatusLabel[order.payment_status]}
                          </StatusBadge>
                        )}
                        {(order as any).refund_requested && order.status !== 'refunded' && (
                          <StatusBadge variant="warning">
                            Remboursement demandé
                          </StatusBadge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      disabled={!settings || downloadingOrderId === order.id}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!settings) return;
                        
                        setDownloadingOrderId(order.id);
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
                            order_items: items.map((item: any) => ({
                              title: item.title,
                              artist_name: item.artist_name,
                              sku: item.sku,
                              quantity: item.quantity,
                              unit_price: item.unit_price,
                              total_price: item.total_price
                            }))
                          };
                          
                          const doc = await generateProPurchaseOrderPDF({
                            order: orderData,
                            settings,
                            vatLabel: 'TVA (20%)',
                            paymentTerms: String(customer?.payment_terms || 30)
                          });
                          downloadProPurchaseOrder(doc, order.order_number);
                        } catch (error) {
                          console.error('Error generating PDF:', error);
                          toast.error('Erreur lors de la génération du bon de commande');
                        } finally {
                          setDownloadingOrderId(null);
                        }
                      }}
                      title="Télécharger le bon de commande"
                    >
                      {downloadingOrderId === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Order details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 bg-secondary/30 space-y-6">
                    {/* Timeline */}
                    <div className="pb-4 border-b border-border">
                      <h4 className="text-sm font-semibold mb-4">Historique de la commande</h4>
                      <OrderTimeline order={order} />
                    </div>

                    {/* Actions for Pro customer */}
                    <div className="flex flex-wrap gap-3">
                      {canCancel && (
                        <Button
                          variant="outline"
                          className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelDialogOrder(order);
                          }}
                        >
                          <XCircle className="w-4 h-4" />
                          Annuler la commande
                        </Button>
                      )}
                      
                      {canRefund && (
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRefundDialogOrder(order);
                          }}
                        >
                          <RefreshCcw className="w-4 h-4" />
                          Demander un remboursement
                        </Button>
                      )}
                      
                      {needsContact && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                          <Mail className="w-4 h-4" />
                          Pour annuler, contactez-nous à{" "}
                          <a href="mailto:pro@outre-national.com" className="text-primary hover:underline">
                            pro@outre-national.com
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Items */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Articles</h4>
                        <div className="space-y-2">
                          {items.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-3 text-sm">
                              <div className="w-10 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
                                {item.image_url ? (
                                  <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground">
                                    VINYL
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{item.title}</p>
                                <p className="text-muted-foreground text-xs">
                                  {item.artist_name || '—'} • ×{item.quantity}
                                </p>
                              </div>
                              <p className="font-medium">{formatCurrency(item.total_price)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <div>
                        <h4 className="text-sm font-semibold mb-3">Détails</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Sous-total</span>
                            <span>{formatCurrency(order.subtotal)}</span>
                          </div>
                          {(order.discount_amount ?? 0) > 0 && (
                            <div className="flex justify-between text-success">
                              <span>Remise</span>
                              <span>-{formatCurrency(order.discount_amount)}</span>
                            </div>
                          )}
                          {(order.shipping_amount ?? 0) > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Livraison</span>
                              <span>{formatCurrency(order.shipping_amount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-semibold pt-2 border-t border-border">
                            <span>Total</span>
                            <span>{formatCurrency(order.total)}</span>
                          </div>
                        </div>

                        {/* Shipping address */}
                        {order.shipping_address && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-semibold mb-2">Livraison</h4>
                            <p className="text-sm text-muted-foreground">
                              {[
                                order.shipping_address,
                                order.shipping_address_line_2,
                                order.shipping_postal_code,
                                order.shipping_city,
                                order.shipping_country
                              ].filter(Boolean).join(', ')}
                            </p>
                          </div>
                        )}

                        {/* Tracking */}
                        {order.tracking_number && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <h4 className="text-sm font-semibold mb-2">N° de suivi</h4>
                            {order.tracking_url ? (
                              <a 
                                href={order.tracking_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm font-mono text-primary hover:underline"
                              >
                                {order.tracking_number}
                              </a>
                            ) : (
                              <p className="text-sm font-mono text-primary">{order.tracking_number}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Order Dialog */}
      <AlertDialog open={!!cancelDialogOrder} onOpenChange={() => setCancelDialogOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir annuler la commande {cancelDialogOrder?.order_number} ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, garder</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelOrder.isPending}
            >
              {cancelOrder.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Oui, annuler
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Refund Request Dialog */}
      <Dialog open={!!refundDialogOrder} onOpenChange={() => {
        setRefundDialogOrder(null);
        setRefundReason("");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demander un remboursement</DialogTitle>
            <DialogDescription>
              Commande {refundDialogOrder?.order_number}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Motif de la demande *</Label>
              <Textarea
                id="refund-reason"
                placeholder="Expliquez la raison de votre demande de remboursement..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
              />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Notre équipe examinera votre demande et vous contactera sous 48h.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRefundDialogOrder(null);
              setRefundReason("");
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleRequestRefund}
              disabled={!refundReason.trim() || requestRefund.isPending}
            >
              {requestRefund.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Timeline component for order history
function OrderTimeline({ order }: { order: any }) {
  const events = useMemo(() => {
    const timeline: { label: string; date: string | null; icon: any; active: boolean }[] = [];
    
    // Created
    timeline.push({
      label: "Commande créée",
      date: order.created_at,
      icon: Clock,
      active: true
    });
    
    // Confirmed
    if (order.confirmed_at || (order.status !== 'pending' && order.status !== 'cancelled')) {
      timeline.push({
        label: "Commande confirmée",
        date: order.confirmed_at || order.created_at,
        icon: CheckCircle,
        active: true
      });
    }
    
    // Processing
    if (order.processing_at || ['processing', 'shipped', 'delivered'].includes(order.status)) {
      timeline.push({
        label: "Commande en préparation",
        date: order.processing_at,
        icon: Package,
        active: true
      });
    }
    
    // Shipped
    if (order.shipped_at || ['shipped', 'delivered'].includes(order.status)) {
      timeline.push({
        label: order.tracking_number 
          ? `Expédiée - ${order.tracking_number}` 
          : "Commande expédiée",
        date: order.shipped_at,
        icon: Truck,
        active: true
      });
    }
    
    // Delivered
    if (order.delivered_at || order.status === 'delivered') {
      timeline.push({
        label: "Commande livrée",
        date: order.delivered_at,
        icon: CheckCircle,
        active: true
      });
    }
    
    // Cancelled
    if (order.cancelled_at || order.status === 'cancelled') {
      timeline.push({
        label: "Commande annulée",
        date: order.cancelled_at,
        icon: Ban,
        active: true
      });
    }
    
    // Refund requested
    if (order.refund_requested_at) {
      timeline.push({
        label: "Remboursement demandé",
        date: order.refund_requested_at,
        icon: AlertTriangle,
        active: true
      });
    }
    
    // Refunded
    if (order.refunded_at || order.status === 'refunded') {
      timeline.push({
        label: "Remboursement effectué",
        date: order.refunded_at,
        icon: RefreshCcw,
        active: true
      });
    }
    
    return timeline;
  }, [order]);

  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            event.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            <event.icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${event.active ? '' : 'text-muted-foreground'}`}>
              {event.label}
            </p>
            {event.date && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(event.date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
