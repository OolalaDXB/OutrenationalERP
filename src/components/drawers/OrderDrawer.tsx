import { useState } from "react";
import { X, ShoppingCart, MapPin, Truck, Clock, Package, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Order, OrderItem } from "@/hooks/useOrders";
import { useCancelOrder } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { OrderFormModal } from "@/components/forms/OrderFormModal";

type OrderWithItems = Order & { order_items?: OrderItem[] };

interface OrderDrawerProps {
  order: OrderWithItems | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDrawer({ order, isOpen, onClose }: OrderDrawerProps) {
  const { canWrite, canDelete } = useAuth();
  const cancelOrder = useCancelOrder();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const handleCancel = async () => {
    if (!order) return;
    try {
      await cancelOrder.mutateAsync({ id: order.id, reason: "Annulation par l'utilisateur" });
      toast({ title: "Commande annulée", description: `La commande ${order.order_number} a été annulée.` });
      setShowCancelDialog(false);
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'annuler la commande.", variant: "destructive" });
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

  const canCancelOrder = order.status !== "cancelled" && order.status !== "delivered" && order.status !== "refunded";

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
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
            {/* Status */}
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
                {order.order_items?.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center flex-shrink-0">
                        <span className="text-[0.5rem] text-muted-foreground/50">VINYL</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.artist_name || '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{formatCurrency(item.unit_price * item.quantity)}</div>
                      <div className="text-xs text-muted-foreground">×{item.quantity}</div>
                    </div>
                  </div>
                ))}
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
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            {/* Actions */}
            {order.status === "pending" && (
              <div className="flex gap-3">
                <Button className="flex-1">Préparer la commande</Button>
              </div>
            )}
            {order.status === "processing" && (
              <Button className="w-full">Marquer comme expédiée</Button>
            )}

            {/* Edit/Cancel Actions */}
            {(canWrite() || canDelete()) && canCancelOrder && (
              <div className="flex gap-3 pt-4 border-t border-border">
                {canWrite() && (
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                )}
                {canDelete() && (
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
    </>
  );
}
