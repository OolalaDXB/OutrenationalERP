import { X, User, Mail, Phone, MapPin, ShoppingCart, Euro, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { Customer, orders, formatCurrency, formatDate, formatDateTime } from "@/data/demo-data";
import { useMemo } from "react";

interface CustomerDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerDrawer({ customer, isOpen, onClose }: CustomerDrawerProps) {
  if (!isOpen || !customer) return null;

  // Commandes du client
  const customerOrders = useMemo(() => {
    return orders.filter((o) => o.customerId === customer.id).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [customer.id]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-lg font-semibold text-primary">
              {customer.firstName[0]}{customer.lastName[0]}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{customer.firstName} {customer.lastName}</h2>
              <p className="text-sm text-muted-foreground">Client depuis {formatDate(customer.createdAt)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contact Info */}
          <div className="bg-secondary rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                {customer.email}
              </a>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{customer.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{customer.city}, {customer.country}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold">{customer.ordersCount}</div>
              <div className="text-xs text-muted-foreground">Commandes</div>
            </div>
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                <Euro className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold">{formatCurrency(customer.totalSpent)}</div>
              <div className="text-xs text-muted-foreground">Total dépensé</div>
            </div>
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold">{customer.ordersCount > 0 ? Math.round(customer.totalSpent / customer.ordersCount) : 0}€</div>
              <div className="text-xs text-muted-foreground">Panier moyen</div>
            </div>
          </div>

          {/* Order History */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Historique des commandes ({customerOrders.length})
            </h3>
            <div className="space-y-3">
              {customerOrders.length === 0 ? (
                <div className="bg-secondary rounded-lg p-6 text-center text-muted-foreground">
                  Aucune commande
                </div>
              ) : (
                customerOrders.map((order) => (
                  <div key={order.id} className="bg-secondary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary">{order.orderNumber}</span>
                        <StatusBadge variant={orderStatusVariant[order.status]}>
                          {orderStatusLabel[order.status]}
                        </StatusBadge>
                      </div>
                      <span className="font-semibold">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{order.items.length} article{order.items.length > 1 ? "s" : ""}</span>
                      <span>{formatDateTime(order.createdAt)}</span>
                    </div>
                    {/* Items preview */}
                    <div className="mt-2 pt-2 border-t border-border/50">
                      {order.items.slice(0, 2).map((item, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground truncate">
                          {item.productTitle} - {item.artist}
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <div className="text-xs text-primary">
                          +{order.items.length - 2} autre{order.items.length - 2 > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button className="flex-1">Créer une commande</Button>
            <Button variant="secondary" className="flex-1">Modifier</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
