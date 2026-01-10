import { useState, useMemo } from "react";
import { X, Mail, Phone, MapPin, ShoppingCart, Euro, Calendar, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Customer } from "@/hooks/useCustomers";
import { useDeleteCustomer } from "@/hooks/useCustomers";
import { useOrdersWithItems } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { CustomerFormModal } from "@/components/forms/CustomerFormModal";

interface CustomerDrawerProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CustomerDrawer({ customer, isOpen, onClose }: CustomerDrawerProps) {
  const { data: allOrders = [] } = useOrdersWithItems();
  const { canWrite, canDelete } = useAuth();
  const deleteCustomer = useDeleteCustomer();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Commandes du client
  const customerOrders = useMemo(() => {
    if (!customer) return [];
    return allOrders
      .filter((o) => o.customer_id === customer.id)
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
  }, [allOrders, customer]);

  const handleDelete = async () => {
    if (!customer) return;
    try {
      await deleteCustomer.mutateAsync(customer.id);
      toast({ title: "Client supprimé", description: `${customer.first_name} ${customer.last_name} a été supprimé.` });
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le client.", variant: "destructive" });
    }
  };

  if (!isOpen || !customer) return null;

  const initials = `${customer.first_name?.[0] || '?'}${customer.last_name?.[0] || ''}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-lg font-semibold text-primary">
                {initials}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{customer.first_name} {customer.last_name}</h2>
                <p className="text-sm text-muted-foreground">Client depuis {formatDate(customer.created_at)}</p>
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
              {customer.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {(customer.city || customer.country) && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{customer.city}{customer.city && customer.country ? ', ' : ''}{customer.country}</span>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-secondary rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{customer.orders_count || 0}</div>
                <div className="text-xs text-muted-foreground">Commandes</div>
              </div>
              <div className="bg-secondary rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                  <Euro className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">{formatCurrency(customer.total_spent)}</div>
                <div className="text-xs text-muted-foreground">Total dépensé</div>
              </div>
              <div className="bg-secondary rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold">
                  {(customer.orders_count || 0) > 0 
                    ? Math.round((customer.total_spent || 0) / (customer.orders_count || 1)) 
                    : 0}€
                </div>
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
                          <span className="font-semibold text-primary">{order.order_number}</span>
                          {order.status && (
                            <StatusBadge variant={orderStatusVariant[order.status]}>
                              {orderStatusLabel[order.status]}
                            </StatusBadge>
                          )}
                        </div>
                        <span className="font-semibold">{formatCurrency(order.total)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>{order.order_items?.length || 0} article{(order.order_items?.length || 0) > 1 ? "s" : ""}</span>
                        <span>{formatDateTime(order.created_at)}</span>
                      </div>
                      {/* Items preview */}
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          {order.order_items.slice(0, 2).map((item) => (
                            <div key={item.id} className="text-xs text-muted-foreground truncate">
                              {item.title} - {item.artist_name || '—'}
                            </div>
                          ))}
                          {order.order_items.length > 2 && (
                            <div className="text-xs text-primary">
                              +{order.order_items.length - 2} autre{order.order_items.length - 2 > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button className="flex-1">Créer une commande</Button>
            </div>

            {/* Edit/Delete Actions */}
            {(canWrite() || canDelete()) && (
              <div className="flex gap-3 pt-4 border-t border-border">
                {canWrite() && (
                  <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                )}
                {canDelete() && (
                  <Button variant="destructive" className="flex-1" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le client "{customer.first_name} {customer.last_name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
