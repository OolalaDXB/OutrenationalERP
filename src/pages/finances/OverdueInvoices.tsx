import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  AlertTriangle,
  Mail,
  Phone,
  Clock,
  FileSpreadsheet,
  Send
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useOverdueInvoicesWithCustomer } from "@/hooks/useOverdueInvoicesWithCustomer";
import { exportToXLS } from "@/lib/excel-utils";
import { toast } from "sonner";

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function getDaysOverdueColor(days: number): string {
  if (days <= 7) return "text-warning";
  if (days <= 30) return "text-orange-500";
  return "text-danger";
}

function getDaysOverdueBadgeClass(days: number): string {
  if (days <= 7) return "bg-warning/20 text-warning border-warning/30";
  if (days <= 30) return "bg-orange-500/20 text-orange-600 border-orange-500/30";
  return "bg-danger/20 text-danger border-danger/30";
}

export default function OverdueInvoicesPage() {
  const { data: overdueInvoices, isLoading } = useOverdueInvoicesWithCustomer();
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const handleSendReminder = async (invoice: NonNullable<typeof overdueInvoices>[0]) => {
    setSendingReminder(invoice.id);
    
    // Simulate sending reminder - in production this would call an API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success(`Rappel envoyé à ${invoice.customer_email || invoice.recipient_name}`);
    setSendingReminder(null);
  };

  const handleExport = () => {
    if (!overdueInvoices) return;
    
    const exportData = overdueInvoices.map(inv => ({
      invoice_number: inv.invoice_number || '',
      customer: inv.recipient_name || '',
      email: inv.customer_email || '',
      phone: inv.customer_phone || '',
      issue_date: inv.issue_date ? format(parseISO(inv.issue_date), 'dd/MM/yyyy') : '',
      due_date: inv.due_date ? format(parseISO(inv.due_date), 'dd/MM/yyyy') : '',
      days_overdue: inv.days_overdue || 0,
      total: Number(inv.total || 0),
    }));

    exportToXLS(exportData, [
      { key: 'invoice_number', header: 'N° Facture' },
      { key: 'customer', header: 'Client' },
      { key: 'email', header: 'Email' },
      { key: 'phone', header: 'Téléphone' },
      { key: 'issue_date', header: 'Date Émission' },
      { key: 'due_date', header: 'Date Échéance' },
      { key: 'days_overdue', header: 'Jours Retard' },
      { key: 'total', header: 'Montant' },
    ], `factures-impayees-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const totalOverdue = overdueInvoices?.reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0;
  const avgDaysOverdue = overdueInvoices?.length 
    ? Math.round(overdueInvoices.reduce((sum, inv) => sum + (inv.days_overdue || 0), 0) / overdueInvoices.length)
    : 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-danger">
              <AlertTriangle className="h-6 w-6" />
              Factures impayées
            </h1>
            <p className="text-muted-foreground">
              Factures en retard de paiement
            </p>
          </div>
          
          <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exporter Excel
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-danger/50">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total impayés</div>
              <div className="text-2xl font-bold text-danger">{formatCurrency(totalOverdue)}</div>
              <div className="text-xs text-muted-foreground">{overdueInvoices?.length || 0} factures</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Retard moyen</div>
              <div className="text-2xl font-bold">{avgDaysOverdue} jours</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Facture la plus ancienne</div>
              <div className="text-2xl font-bold">
                {overdueInvoices?.[0]?.days_overdue || 0} jours
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
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !overdueInvoices || overdueInvoices.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-success text-4xl mb-4">🎉</div>
                <div className="text-lg font-medium">Aucune facture impayée</div>
                <div className="text-muted-foreground">Toutes les factures sont à jour !</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facture</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Retard</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="font-medium">{invoice.invoice_number}</div>
                        <div className="text-xs text-muted-foreground">
                          Émise le {invoice.issue_date && format(parseISO(invoice.issue_date), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{invoice.recipient_name}</div>
                        {invoice.company_name && (
                          <div className="text-xs text-muted-foreground">{invoice.company_name}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {invoice.customer_email && (
                            <a 
                              href={`mailto:${invoice.customer_email}`}
                              className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                              <Mail className="h-3 w-3" />
                              {invoice.customer_email}
                            </a>
                          )}
                          {invoice.customer_phone && (
                            <a 
                              href={`tel:${invoice.customer_phone}`}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                            >
                              <Phone className="h-3 w-3" />
                              {invoice.customer_phone}
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {invoice.due_date && format(parseISO(invoice.due_date), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn("gap-1", getDaysOverdueBadgeClass(invoice.days_overdue || 0))}
                        >
                          <Clock className="h-3 w-3" />
                          {invoice.days_overdue} jours
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={cn("font-bold", getDaysOverdueColor(invoice.days_overdue || 0))}>
                          {formatCurrency(Number(invoice.total || 0))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendReminder(invoice)}
                                disabled={sendingReminder === invoice.id || !invoice.customer_email}
                                className="gap-1"
                              >
                                <Send className="h-3 w-3" />
                                {sendingReminder === invoice.id ? "Envoi..." : "Rappel"}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {invoice.customer_email 
                                ? `Envoyer un rappel à ${invoice.customer_email}`
                                : "Pas d'email disponible"}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
