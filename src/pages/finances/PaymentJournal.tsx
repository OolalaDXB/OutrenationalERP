import { useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CreditCard, 
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePaymentJournal } from "@/hooks/usePaymentJournal";
import { exportToXLS } from "@/lib/excel-utils";

interface PaymentJournalPageProps {
  onNavigate?: (path: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  paid: { label: "Payé", icon: CheckCircle2, className: "bg-success/20 text-success border-success/30" },
  pending: { label: "En attente", icon: Clock, className: "bg-warning/20 text-warning border-warning/30" },
  partial: { label: "Partiel", icon: AlertCircle, className: "bg-info/20 text-info border-info/30" },
  refunded: { label: "Remboursé", icon: XCircle, className: "bg-muted/50 text-muted-foreground" },
  failed: { label: "Échoué", icon: XCircle, className: "bg-danger/20 text-danger border-danger/30" },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Virement bancaire",
  paypal: "PayPal",
  cash: "Espèces",
  check: "Chèque",
  card: "Carte bancaire",
  other: "Autre",
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export default function PaymentJournalPage({ onNavigate }: PaymentJournalPageProps) {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 2)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: transactions, isLoading } = usePaymentJournal(startDate, endDate);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(tx => {
      if (statusFilter !== "all" && tx.payment_status !== statusFilter) return false;
      if (methodFilter !== "all" && tx.payment_method !== methodFilter) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          tx.invoice_number?.toLowerCase().includes(searchLower) ||
          tx.recipient_name?.toLowerCase().includes(searchLower) ||
          tx.payment_reference?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [transactions, statusFilter, methodFilter, search]);

  const stats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, tx) => sum + Number(tx.total || 0), 0);
    const paid = filteredTransactions.filter(tx => tx.payment_status === 'paid').reduce((sum, tx) => sum + Number(tx.total || 0), 0);
    const pending = filteredTransactions.filter(tx => tx.payment_status === 'pending').reduce((sum, tx) => sum + Number(tx.total || 0), 0);
    return { total, paid, pending, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const handleExport = () => {
    const exportData = filteredTransactions.map(tx => ({
      date: tx.paid_at ? format(parseISO(tx.paid_at), 'dd/MM/yyyy') : tx.issue_date ? format(parseISO(tx.issue_date), 'dd/MM/yyyy') : '',
      invoice_number: tx.invoice_number || '',
      recipient: tx.recipient_name || '',
      method: PAYMENT_METHOD_LABELS[tx.payment_method || ''] || tx.payment_method || '',
      reference: tx.payment_reference || '',
      status: STATUS_CONFIG[tx.payment_status || '']?.label || tx.payment_status || '',
      total: Number(tx.total || 0),
    }));

    exportToXLS(exportData, [
      { key: 'date', header: 'Date' },
      { key: 'invoice_number', header: 'N° Facture' },
      { key: 'recipient', header: 'Client' },
      { key: 'method', header: 'Méthode' },
      { key: 'reference', header: 'Référence' },
      { key: 'status', header: 'Statut' },
      { key: 'total', header: 'Montant' },
    ], `journal-paiements-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const paymentMethods = useMemo(() => {
    if (!transactions) return [];
    const methods = new Set(transactions.map(tx => tx.payment_method).filter(Boolean));
    return Array.from(methods) as string[];
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onNavigate?.("/finances")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Journal des paiements
            </h1>
            <p className="text-muted-foreground">
              Historique des transactions financières
            </p>
          </div>
        </div>
        
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Exporter Excel
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(startDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => d && setStartDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">→</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(endDate, 'dd/MM/yyyy')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(d) => d && setEndDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="partial">Partiel</SelectItem>
                <SelectItem value="refunded">Remboursé</SelectItem>
              </SelectContent>
            </Select>

            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Méthode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes méthodes</SelectItem>
                {paymentMethods.map(method => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method] || method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total période</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.total)}</div>
            <div className="text-xs text-muted-foreground">{stats.count} transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Encaissé</div>
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.paid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">En attente</div>
            <div className="text-2xl font-bold text-warning">{formatCurrency(stats.pending)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Taux d'encaissement</div>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? ((stats.paid / stats.total) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              Aucune transaction pour cette période
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => {
                  const statusConfig = STATUS_CONFIG[tx.payment_status || 'pending'];
                  const StatusIcon = statusConfig?.icon || Clock;
                  
                  return (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-sm">
                        {tx.paid_at 
                          ? format(parseISO(tx.paid_at), 'dd/MM/yyyy', { locale: fr })
                          : tx.issue_date 
                            ? format(parseISO(tx.issue_date), 'dd/MM/yyyy', { locale: fr })
                            : '-'}
                      </TableCell>
                      <TableCell className="font-medium">{tx.invoice_number}</TableCell>
                      <TableCell>{tx.recipient_name}</TableCell>
                      <TableCell>
                        {PAYMENT_METHOD_LABELS[tx.payment_method || ''] || tx.payment_method || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {tx.payment_reference || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1", statusConfig?.className)}>
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig?.label || tx.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(tx.total || 0))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
