import { FileText, Mail, MapPin, Calendar, User, Pencil, Copy, Download, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type InvoiceItem = Tables<"invoice_items">;

interface InvoiceWithItems extends Invoice {
  invoice_items: InvoiceItem[];
}

interface InvoiceDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithItems | null;
  onEdit?: (invoice: InvoiceWithItems) => void;
  onDuplicate?: (invoice: InvoiceWithItems) => void;
  onDownloadPDF?: (invoice: InvoiceWithItems) => void;
  onMarkAsPaid?: (invoice: InvoiceWithItems) => void;
}

const statusVariant: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  draft: "primary",
  sent: "info",
  paid: "success",
  overdue: "danger",
  cancelled: "primary",
};

const statusLabel: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

export function InvoiceDrawer({ 
  open, 
  onOpenChange, 
  invoice,
  onEdit,
  onDuplicate,
  onDownloadPDF,
  onMarkAsPaid,
}: InvoiceDrawerProps) {
  if (!invoice) return null;

  const handleEdit = () => {
    onEdit?.(invoice);
    onOpenChange(false);
  };

  const handleDuplicate = () => {
    onDuplicate?.(invoice);
    onOpenChange(false);
  };

  const handleDownloadPDF = () => {
    onDownloadPDF?.(invoice);
  };

  const handleMarkAsPaid = () => {
    onMarkAsPaid?.(invoice);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{invoice.invoice_number}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge variant={statusVariant[invoice.status || "draft"]}>
                  {statusLabel[invoice.status || "draft"]}
                </StatusBadge>
                <span className="text-sm text-muted-foreground">
                  {invoice.type === "customer" ? "Facture client" : "Reversement fournisseur"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            {invoice.status !== "paid" && onMarkAsPaid && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2 text-success border-success/30 hover:bg-success/10"
                onClick={handleMarkAsPaid}
              >
                <Check className="w-4 h-4" />
                Marquer payée
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="sm" className="gap-2" onClick={handleEdit}>
                <Pencil className="w-4 h-4" />
                Modifier
              </Button>
            )}
            {onDuplicate && (
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDuplicate}>
                <Copy className="w-4 h-4" />
                Dupliquer
              </Button>
            )}
            {onDownloadPDF && (
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadPDF}>
                <Download className="w-4 h-4" />
                PDF
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Montants */}
          <div className="bg-secondary/50 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sous-total</p>
                <p className="font-semibold">{formatCurrency(invoice.subtotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">TVA</p>
                <p className="font-semibold">{formatCurrency(invoice.tax_amount || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="font-bold text-lg text-primary">{formatCurrency(invoice.total)}</p>
              </div>
            </div>
          </div>

          {/* Destinataire */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Destinataire
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{invoice.recipient_name}</p>
                </div>
              </div>
              {invoice.recipient_email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${invoice.recipient_email}`} 
                    className="text-sm text-primary hover:underline"
                  >
                    {invoice.recipient_email}
                  </a>
                </div>
              )}
              {invoice.recipient_address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {invoice.recipient_address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Dates
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Émission</p>
                  <p className="text-sm font-medium">{formatDate(invoice.issue_date)}</p>
                </div>
              </div>
              {invoice.due_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Échéance</p>
                    <p className="text-sm font-medium">{formatDate(invoice.due_date)}</p>
                  </div>
                </div>
              )}
              {invoice.paid_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-success" />
                  <div>
                    <p className="text-xs text-muted-foreground">Paiement</p>
                    <p className="text-sm font-medium text-success">{formatDate(invoice.paid_date)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lignes de facture */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Détail des lignes ({invoice.invoice_items.length})
            </h3>
            <div className="space-y-2">
              {invoice.invoice_items.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-semibold text-sm ml-4">
                    {formatCurrency(item.total_price)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Paiement */}
          {(invoice.payment_method || invoice.payment_reference) && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Paiement
              </h3>
              <div className="space-y-2 text-sm">
                {invoice.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Méthode</span>
                    <span className="font-medium">{invoice.payment_method}</span>
                  </div>
                )}
                {invoice.payment_reference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Référence</span>
                    <span className="font-medium font-mono text-xs">{invoice.payment_reference}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Notes
              </h3>
              <p className="text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg whitespace-pre-line">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Notes internes */}
          {invoice.internal_notes && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Notes internes
              </h3>
              <p className="text-sm text-muted-foreground bg-warning/10 border border-warning/20 p-3 rounded-lg whitespace-pre-line">
                {invoice.internal_notes}
              </p>
            </div>
          )}

          {/* Métadonnées */}
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span>Créée le: </span>
                <span>{invoice.created_at ? formatDate(invoice.created_at) : "-"}</span>
              </div>
              <div>
                <span>Modifiée le: </span>
                <span>{invoice.updated_at ? formatDate(invoice.updated_at) : "-"}</span>
              </div>
              {invoice.currency && (
                <div>
                  <span>Devise: </span>
                  <span className="font-medium">{invoice.currency}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
