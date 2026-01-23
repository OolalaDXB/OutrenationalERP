import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  FileText, 
  Download, 
  Search, 
  Loader2,
  Receipt,
  ExternalLink,
  ShoppingBag,
  RefreshCw
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProInvoices, type ProInvoice } from "@/hooks/useProInvoices";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { generateOrderInvoicePDF, downloadOrderInvoice } from "@/components/orders/OrderInvoicePDF";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";

type InvoiceStatus = 'all' | 'paid' | 'pending' | 'cancelled';

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'paid', label: 'Payées' },
  { value: 'pending', label: 'En attente' },
  { value: 'cancelled', label: 'Annulées' },
];

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'paid':
      return <Badge className="bg-success/10 text-success border-success">Payée</Badge>;
    case 'pending':
    case 'draft':
      return <Badge className="bg-warning/10 text-warning border-warning">En attente</Badge>;
    case 'cancelled':
      return <Badge className="bg-destructive/10 text-destructive border-destructive">Annulée</Badge>;
    default:
      return <Badge variant="outline">{status || '—'}</Badge>;
  }
}

export function ProInvoices() {
  const { data: invoices = [], isLoading, error, refetch, isFetching } = useProInvoices();
  const { data: settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus>('all');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Track when initial load completes for animation
  if (!isLoading && !hasLoaded) {
    setHasLoaded(true);
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = searchTerm === '' || 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        invoice.status === statusFilter ||
        (statusFilter === 'pending' && invoice.status === 'draft');

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  const handleDownloadPDF = async (invoice: ProInvoice) => {
    // If pre-generated PDF URL exists, open it
    if (invoice.pdf_url) {
      window.open(invoice.pdf_url, '_blank');
      toast.success('Facture téléchargée');
      return;
    }
    
    // Generate PDF on-the-fly
    if (!invoice.order_id) {
      toast.error('Impossible de générer la facture : commande non trouvée');
      return;
    }

    setDownloadingInvoiceId(invoice.id);

    try {
      // Fetch the complete order with items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', invoice.order_id)
        .single();

      if (orderError || !order) {
        throw new Error('Commande introuvable');
      }

      if (!settings) {
        throw new Error('Paramètres de la boutique non disponibles');
      }

      // Generate the PDF
      const doc = await generateOrderInvoicePDF({
        order: order as any,
        settings: settings,
        invoiceNumber: invoice.invoice_number
      });

      // Download the PDF
      downloadOrderInvoice(doc, invoice.invoice_number);
      toast.success('Facture générée avec succès');

    } catch (err) {
      console.error('Error generating invoice PDF:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération de la facture');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Filters skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table skeleton */}
        <Card>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3"><Skeleton className="h-3 w-20" /></th>
                    <th className="text-left px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3 w-16" /></th>
                    <th className="text-left px-4 py-3 hidden md:table-cell"><Skeleton className="h-3 w-24" /></th>
                    <th className="text-right px-4 py-3"><Skeleton className="h-3 w-20 ml-auto" /></th>
                    <th className="text-left px-4 py-3"><Skeleton className="h-3 w-16" /></th>
                    <th className="text-right px-4 py-3"><Skeleton className="h-3 w-12 ml-auto" /></th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-4 hidden sm:table-cell"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-4 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-4 text-right"><Skeleton className="h-5 w-16 ml-auto" /></td>
                      <td className="px-4 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="px-4 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Erreur lors du chargement des factures</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-opacity duration-300 ${hasLoaded ? 'animate-fade-in' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes factures</h1>
          <p className="text-muted-foreground">Téléchargez vos factures</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualiser</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par n° de facture..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(option => (
                <Button
                  key={option.value}
                  variant={statusFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      {filteredInvoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune facture disponible</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {invoices.length === 0 
                ? "Vous n'avez pas encore de factures. Les factures sont générées après confirmation de vos commandes." 
                : "Aucune facture ne correspond à votre recherche."}
            </p>
            {invoices.length === 0 && (
              <Link to="/pro/orders">
                <Button variant="outline" className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Voir mes commandes
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      N° Facture
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                      Commande
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Montant TTC
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Statut
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(invoice => (
                    <tr 
                      key={invoice.id} 
                      className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <span className="font-medium">{invoice.invoice_number}</span>
                        <span className="sm:hidden block text-xs text-muted-foreground mt-1">
                          {formatDate(invoice.issue_date)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                        {formatDate(invoice.issue_date)}
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        {invoice.order?.order_number ? (
                          <Link 
                            to="/pro/orders" 
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {invoice.order.order_number}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(invoice.total, invoice.currency || 'EUR')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                          disabled={downloadingInvoiceId === invoice.id}
                          className="gap-1.5"
                        >
                          {downloadingInvoiceId === invoice.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">PDF</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}