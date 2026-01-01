import { X, ShoppingCart, MapPin, Truck, Clock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { Order, formatCurrency, formatDateTime } from "@/data/demo-data";

interface OrderDrawerProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDrawer({ order, isOpen, onClose }: OrderDrawerProps) {
  if (!isOpen || !order) return null;

  const timeline = [
    { status: "pending", label: "Commande reçue", date: order.createdAt, active: true },
    { status: "processing", label: "En préparation", date: order.status !== "pending" ? order.createdAt : null, active: order.status !== "pending" && order.status !== "cancelled" },
    { status: "shipped", label: "Expédiée", date: order.trackingNumber ? order.createdAt : null, active: order.status === "shipped" || order.status === "delivered" },
    { status: "delivered", label: "Livrée", date: order.status === "delivered" ? order.createdAt : null, active: order.status === "delivered" },
  ];

  return (
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
              <h2 className="text-lg font-semibold">Commande {order.orderNumber}</h2>
              <p className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge variant={orderStatusVariant[order.status]}>
              {orderStatusLabel[order.status]}
            </StatusBadge>
            {order.paymentStatus === "paid" && (
              <span className="text-sm text-success font-medium">Payé</span>
            )}
            {order.paymentStatus === "refunded" && (
              <span className="text-sm text-danger font-medium">Remboursé</span>
            )}
          </div>

          {/* Customer */}
          <div className="bg-secondary rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                {order.customerName.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-medium">{order.customerName}</div>
                <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{order.shippingAddress}</span>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Suivi
            </h3>
            <div className="space-y-3">
              {timeline.map((step, index) => (
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
            {order.trackingNumber && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Suivi :</span>
                <span className="font-mono text-primary">{order.trackingNumber}</span>
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Articles ({order.items.length})
            </h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center flex-shrink-0">
                    <span className="text-[0.5rem] text-muted-foreground/50">VINYL</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.productTitle}</div>
                    <div className="text-xs text-muted-foreground">{item.artist}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">{formatCurrency(item.unitPrice * item.quantity)}</div>
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
              <span>{formatCurrency(order.shipping)}</span>
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
              <Button variant="secondary">Annuler</Button>
            </div>
          )}
          {order.status === "processing" && (
            <Button className="w-full">Marquer comme expédiée</Button>
          )}
        </div>
      </div>
    </div>
  );
}
