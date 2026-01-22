import { useState, useEffect, useRef } from "react";
import { FileText, Package, Loader2, ChevronDown, ChevronUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateProInvoicePDF } from "@/components/pro/ProInvoicePDF";
import { StatusBadge, orderStatusVariant, orderStatusLabel } from "@/components/ui/status-badge";
import { useProAuth } from "@/hooks/useProAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export function ProOrders() {
  const { customer } = useProAuth();
  const queryClient = useQueryClient();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
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
          // Skip toast on initial mount
          if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
          }
          
          // Show toast notification for status changes
          const newStatus = payload.new?.status;
          const orderNumber = payload.new?.order_number;
          
          if (newStatus && orderNumber) {
            const statusLabel = orderStatusLabel[newStatus as keyof typeof orderStatusLabel] || newStatus;
            toast.success(`Commande ${orderNumber}`, {
              description: `Statut mis à jour : ${statusLabel}`,
            });
          }
          
          // Refetch orders when any change occurs
          queryClient.invalidateQueries({ queryKey: ['pro_orders_full', customer.id] });
        }
      )
      .subscribe();

    // Reset initial mount flag after a short delay
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 1000);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [customer?.id, queryClient]);

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
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(order.total)}</p>
                      {order.status && (
                        <StatusBadge variant={orderStatusVariant[order.status]}>
                          {orderStatusLabel[order.status]}
                        </StatusBadge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (customer) {
                          generateProInvoicePDF(order, customer);
                        }
                      }}
                      title="Télécharger la facture"
                    >
                      <Download className="w-4 h-4" />
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
                  <div className="border-t border-border p-4 bg-secondary/30">
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
                            <h4 className="text-sm font-semibold mb-2">Suivi</h4>
                            <p className="text-sm font-mono text-primary">{order.tracking_number}</p>
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
    </div>
  );
}
