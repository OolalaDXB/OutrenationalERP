import { useState, useMemo } from "react";
import { X, Mail, Phone, MapPin, ShoppingCart, Euro, Calendar, Pencil, Trash2, Building2, Globe, FileText, UserCircle } from "lucide-react";
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
import { getVatStatusLabel, isValidVatNumberFormat, type CustomerType } from "@/lib/vat-utils";

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
  const isProfessional = customer.customer_type === 'professionnel';
  const hasValidVat = isValidVatNumberFormat(customer.vat_number);
  const vatStatus = getVatStatusLabel(
    customer.country, 
    (customer.customer_type as CustomerType) || 'particulier', 
    hasValidVat
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border z-10">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
                isProfessional 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {isProfessional ? <Building2 className="w-6 h-6" /> : initials}
              </div>
              <div>
                {isProfessional && customer.company_name ? (
                  <>
                    <h2 className="text-lg font-semibold">{customer.company_name}</h2>
                    <p className="text-sm text-muted-foreground">{customer.first_name} {customer.last_name}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-semibold">{customer.first_name} {customer.last_name}</h2>
                    <p className="text-sm text-muted-foreground">Client depuis {formatDate(customer.created_at)}</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isProfessional 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {isProfessional ? 'Professionnel' : 'Particulier'}
              </span>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* TVA Status Banner */}
            <div className={`rounded-lg p-3 flex items-center justify-between ${
              vatStatus.includes('0%') 
                ? 'bg-green-50 dark:bg-green-900/20' 
                : 'bg-muted'
            }`}>
              <div className="flex items-center gap-2">
                <FileText className={`w-4 h-4 ${
                  vatStatus.includes('0%') ? 'text-green-600' : 'text-muted-foreground'
                }`} />
                <span className="text-sm font-medium">Statut TVA</span>
              </div>
              <span className={`text-sm font-semibold ${
                vatStatus.includes('0%') ? 'text-green-600' : 'text-foreground'
              }`}>
                {vatStatus}
              </span>
            </div>

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
              {(customer.address || customer.city || customer.country) && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    {customer.address && <div>{customer.address}</div>}
                    {customer.address_line_2 && <div>{customer.address_line_2}</div>}
                    <div>
                      {[
                        customer.postal_code,
                        customer.city,
                        (customer as any).state,
                        customer.country
                      ].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              )}
              {(customer as any).website && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={(customer as any).website} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline"
                  >
                    {(customer as any).website}
                  </a>
                </div>
              )}
            </div>

            {/* Professional Info */}
            {isProfessional && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Informations entreprise
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {customer.company_name && (
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground mb-1">Raison sociale</div>
                      <div className="font-medium">{customer.company_name}</div>
                    </div>
                  )}
                  {customer.vat_number && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">TVA Intracommunautaire</div>
                      <div className="font-medium flex items-center gap-2">
                        {customer.vat_number}
                        {hasValidVat ? (
                          <span className="text-xs text-green-600">✓</span>
                        ) : (
                          <span className="text-xs text-amber-600">⚠</span>
                        )}
                      </div>
                    </div>
                  )}
                  {customer.discount_rate != null && customer.discount_rate > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Remise accordée</div>
                      <div className="font-medium">{(customer.discount_rate * 100).toFixed(0)}%</div>
                    </div>
                  )}
                  {customer.payment_terms != null && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Délai de paiement</div>
                      <div className="font-medium">{customer.payment_terms} jours</div>
                    </div>
                  )}
                  {customer.credit_limit != null && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Encours autorisé</div>
                      <div className="font-medium">{formatCurrency(customer.credit_limit)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

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

      {/* Edit Modal */}
      <CustomerFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        customer={customer}
      />

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
