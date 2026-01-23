import { useState, useEffect, useRef, useMemo } from "react";
import { FileText, Package, Loader2, ChevronDown, ChevronUp, Download, XCircle, RefreshCcw, Clock, Mail, Truck, CheckCircle, Ban, AlertTriangle, Search, PackageCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateProPurchaseOrderPDF, downloadProPurchaseOrder } from "@/components/pro/ProPurchaseOrderPDF";
import { generateOrderInvoicePDF, downloadOrderInvoice } from "@/components/orders/OrderInvoicePDF";
import { StatusBadge, orderStatusVariant, orderStatusLabel, paymentStatusVariant, paymentStatusLabel } from "@/components/ui/status-badge";
import { useProAuth } from "@/hooks/useProAuth";
import { useSettings, type Settings } from "@/hooks/useSettings";

// Fallback settings for PDF generation when settings are loading
const FALLBACK_SETTINGS: Settings = {
  id: 'fallback',
  shop_name: 'Outre-National',
  legal_name: 'Outre-National',
  shop_email: null,
  shop_phone: null,
  shop_address: null,
  shop_city: null,
  shop_postal_code: null,
  shop_country: 'France',
  vat_number: null,
  siret: null,
  vat_rate: 20,
  default_currency: 'EUR',
  invoice_prefix: 'FC',
  invoice_next_number: 1,
  payout_invoice_prefix: 'REV',
  payout_invoice_next_number: 1,
  credit_note_prefix: 'AV',
  credit_note_next_number: 1,
  primary_color: null,
  shop_logo_url: null,
  payment_terms_text: null,
  legal_mentions: null,
  bank_name: null,
  iban: null,
  bic: null,
  eori: null,
  cgv: null,
  paypal_email: null,
  show_artists_section: true,
  visible_widgets: null,
  widget_order: null,
  sales_channels: null,
  custom_marketplace_mappings: null,
};
import { useCancelProOrder, useRequestRefund } from "@/hooks/useProOrders";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { format, startOfMonth, subMonths, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Order steps for visual progress tracker
const ORDER_STEPS = [
  { key: 'pending', label: 'En attente', icon: Clock },
  { key: 'confirmed', label: 'Confirmée', icon: CheckCircle },
  { key: 'processing', label: 'Préparation', icon: Package },
  { key: 'shipped', label: 'Expédiée', icon: Truck },
  { key: 'delivered', label: 'Livrée', icon: PackageCheck },
] as const;

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
};

function getStepIndex(status: string): number {
  return STATUS_ORDER[status] ?? 0;
}

// Horizontal Order Progress Tracker
function OrderProgressTracker({ status }: { status: string }) {
  // Handle cancelled/refunded orders
  if (status === 'cancelled' || status === 'refunded') {
    return (
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg",
        status === 'cancelled' ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
      )}>
        {status === 'cancelled' ? <XCircle className="w-5 h-5" /> : <RefreshCcw className="w-5 h-5" />}
        <span className="font-medium">
          {status === 'cancelled' ? 'Commande annulée' : 'Commande remboursée'}
        </span>
      </div>
    );
  }

  const currentIndex = getStepIndex(status);

  return (
    <div className="w-full py-4">
      {/* Desktop horizontal tracker */}
      <div className="hidden sm:flex items-center justify-between">
        {ORDER_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={step.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center relative">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                    isCompleted && "bg-primary border-primary text-primary-foreground",
                    isCurrent && "bg-primary border-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background",
                    isPending && "bg-muted border-border text-muted-foreground"
                  )}
                >
                  <StepIcon className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs font-medium text-center whitespace-nowrap",
                    isCompleted && "text-primary",
                    isCurrent && "text-primary font-semibold",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < ORDER_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-1 mx-2 rounded transition-colors",
                    idx < currentIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile vertical tracker */}
      <div className="sm:hidden space-y-3">
        {ORDER_STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary border-primary text-primary-foreground",
                  isPending && "bg-muted border-border text-muted-foreground"
                )}
              >
                <StepIcon className="w-4 h-4" />
              </div>
              <span
                className={cn(
                  "text-sm font-medium",
                  isCompleted && "text-primary",
                  isCurrent && "text-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {isCurrent && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Actuel
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ProOrders() {
  const { customer } = useProAuth();
  const { data: settings } = useSettings();
  const queryClient = useQueryClient();
  const cancelOrder = useCancelProOrder();
  const requestRefund = useRequestRefund();
  
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [cancelDialogOrder, setCancelDialogOrder] = useState<any | null>(null);
  const [refundDialogOrder, setRefundDialogOrder] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const isInitialMount = useRef(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Fetch customer's orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['pro_orders_full', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      
      // Fetch orders with items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      
      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        return [];
      }
      
      // Fetch invoices for these orders
      const orderIds = ordersData.map(o => o.id);
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, order_id')
        .in('order_id', orderIds);
      
      if (invoicesError) throw invoicesError;
      
      // Merge invoices into orders
      return ordersData.map(order => ({
        ...order,
        invoices: invoicesData?.filter(inv => inv.order_id === order.id) || []
      }));
    },
    enabled: !!customer?.id
  });

  // Filter orders based on search and filters
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(order => 
        order.order_number.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(order => order.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateFilter) {
        case 'this_month':
          startDate = startOfMonth(now);
          break;
        case 'last_month':
          startDate = startOfMonth(subMonths(now, 1));
          break;
        case 'last_3_months':
          startDate = startOfMonth(subMonths(now, 3));
          break;
        case 'this_year':
          startDate = startOfYear(now);
          break;
        default:
          startDate = new Date(0);
      }

      result = result.filter(order => new Date(order.created_at) >= startDate);
    }

    return result;
  }, [orders, searchQuery, statusFilter, dateFilter]);

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

  // Handle invoice download
  const handleDownloadInvoice = async (order: any) => {
    const effectiveSettings = settings || FALLBACK_SETTINGS;
    
    const invoice = order.invoices?.[0];
    if (!invoice) {
      toast.error("Aucune facture disponible pour cette commande");
      return;
    }

    setDownloadingInvoiceId(order.id);
    try {
      const doc = await generateOrderInvoicePDF({ 
        order, 
        settings: effectiveSettings,
        invoiceNumber: invoice.invoice_number
      });
      downloadOrderInvoice(doc, invoice.invoice_number);
      toast.success("Facture téléchargée");
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      toast.error('Erreur lors de la génération de la facture');
    } finally {
      setDownloadingInvoiceId(null);
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

  // Check if order can have invoice downloaded
  const canDownloadInvoice = (order: any) => {
    const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];
    return validStatuses.includes(order.status) && order.invoices?.length > 0;
  };

  const shouldShowInvoiceInfo = (order: any) => {
    const validStatuses = ['confirmed', 'processing', 'shipped', 'delivered'];
    return validStatuses.includes(order.status) && (!order.invoices || order.invoices.length === 0);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setDateFilter("all");
  };

  const hasActiveFilters = searchQuery.trim() || statusFilter !== 'all' || dateFilter !== 'all';

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

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par n° de commande..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="confirmed">Confirmée</SelectItem>
            <SelectItem value="processing">En préparation</SelectItem>
            <SelectItem value="shipped">Expédiée</SelectItem>
            <SelectItem value="delivered">Livrée</SelectItem>
            <SelectItem value="cancelled">Annulée</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Date Filter */}
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Période" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les dates</SelectItem>
            <SelectItem value="this_month">Ce mois</SelectItem>
            <SelectItem value="last_month">Mois dernier</SelectItem>
            <SelectItem value="last_3_months">3 derniers mois</SelectItem>
            <SelectItem value="this_year">Cette année</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Results count when filtered */}
      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          {filteredOrders.length} résultat(s) sur {orders.length} commande(s)
        </p>
      )}

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {hasActiveFilters ? "Aucun résultat" : "Aucune commande"}
          </h2>
          <p className="text-muted-foreground">
            {hasActiveFilters 
              ? "Essayez de modifier vos filtres de recherche."
              : "Vous n'avez pas encore passé de commande."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" className="mt-4" onClick={clearFilters}>
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => {
            const isExpanded = expandedOrderId === order.id;
            const items = order.order_items || [];
            const canCancel = order.status === 'pending';
            const canRefund = canRequestRefund(order);
            const needsContact = order.status === 'confirmed' || order.status === 'processing';
            const hasInvoice = canDownloadInvoice(order);

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
                        {order.refund_requested && order.status !== 'refunded' && (
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
                      disabled={downloadingOrderId === order.id}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const effectiveSettings = settings || FALLBACK_SETTINGS;
                        
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
                            settings: effectiveSettings,
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
                    {/* Visual Progress Tracker */}
                    <div className="pb-4 border-b border-border">
                      <h4 className="text-sm font-semibold mb-2">Suivi de la commande</h4>
                      <OrderProgressTracker status={order.status} />
                    </div>

                    {/* Actions for Pro customer */}
                    <div className="flex flex-wrap gap-3">
                      {/* Invoice download button */}
                      {hasInvoice && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled={downloadingInvoiceId === order.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadInvoice(order);
                          }}
                        >
                          {downloadingInvoiceId === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          Télécharger la facture
                        </Button>
                      )}

                      {!hasInvoice && shouldShowInvoiceInfo(order) && (
                        <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                          Facture disponible une fois générée par notre équipe.
                        </div>
                      )}

                      {canCancel && (
                        <Button
                          variant="outline"
                          size="sm"
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
                          size="sm"
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
