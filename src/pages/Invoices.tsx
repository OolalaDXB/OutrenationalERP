import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Euro, Clock, CheckCircle, XCircle, Download, Plus, Pencil, Copy, Trash2, Check, X, Search } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import { addInvoiceHistory } from "@/hooks/useInvoiceHistory";
import { InvoiceFormModal } from "@/components/forms/InvoiceFormModal";
import { InvoiceEditModal } from "@/components/forms/InvoiceEditModal";
import { InvoiceDrawer } from "@/components/drawers/InvoiceDrawer";
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
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Tables } from "@/integrations/supabase/types";

type Invoice = Tables<"invoices">;
type InvoiceItem = Tables<"invoice_items">;

interface InvoiceWithItems extends Invoice {
  invoice_items: InvoiceItem[];
}

const statusVariant: Record<string, "success" | "warning" | "danger" | "info" | "primary"> = {
  draft: "primary",
  sent: "info",
  paid: "success",
  overdue: "danger",
  cancelled: "danger",
};

const statusLabel: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

export function InvoicesPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithItems | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<InvoiceWithItems | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceWithItems | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync search term with URL params
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch && urlSearch !== searchTerm) {
      setSearchTerm(urlSearch);
    }
  }, [searchParams, searchTerm]);

  // Fetch invoices from Supabase
  const {
    data: invoices = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["invoices"],
    retry: false,
    queryFn: async () => {
      // Guard: surface misconfiguration early (prevents endless spinners)
      const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
      if (!url || !key) {
        throw new Error(
          "Configuration Supabase manquante: VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY."
        );
      }

      // Timeout guard to avoid a fetch that never resolves
      const timeoutMs = 15000;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout lors du chargement des factures.")), timeoutMs)
      );

      const request = (async () => {
        const { data, error } = await supabase
          .from("invoices")
          .select(`
            *,
            invoice_items (*)
          `)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data as InvoiceWithItems[];
      })();

      return await Promise.race([request, timeout]);
    },
  });

  // Filtrage - MUST be before any conditional returns to respect hooks rules
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        searchTerm === "" ||
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.recipient_name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      const matchesType = typeFilter === "all" || invoice.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [invoices, searchTerm, statusFilter, typeFilter]);

  // Stats - MUST be before any conditional returns to respect hooks rules
  const stats = useMemo(() => {
    const totalAmount = invoices.reduce((sum, i) => sum + i.total, 0);
    const paidAmount = invoices
      .filter((i) => i.status === "paid")
      .reduce((sum, i) => sum + i.total, 0);
    const pendingAmount = invoices
      .filter((i) => i.status === "sent" || i.status === "draft")
      .reduce((sum, i) => sum + i.total, 0);
    const overdueCount = invoices.filter((i) => i.status === "overdue").length;

    return { totalAmount, paidAmount, pendingAmount, overdueCount };
  }, [invoices]);

  // Génération PDF
  const generatePDF = (invoice: InvoiceWithItems) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(113, 75, 103);
    doc.text("OUTRE-NATIONAL", 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Distribution de vinyles", 20, 32);

    // Invoice info
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Facture ${invoice.invoice_number}`, 120, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${formatDate(invoice.issue_date)}`, 120, 35);
    if (invoice.due_date) {
      doc.text(`Échéance: ${formatDate(invoice.due_date)}`, 120, 42);
    }

    // Recipient
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Destinataire:", 20, 55);
    doc.setFontSize(10);
    doc.text(invoice.recipient_name, 20, 62);
    if (invoice.recipient_email) {
      doc.text(invoice.recipient_email, 20, 69);
    }
    if (invoice.recipient_address) {
      doc.text(invoice.recipient_address, 20, 76);
    }

    // Table
    autoTable(doc, {
      startY: 95,
      head: [["Description", "Qté", "Prix unit.", "Total"]],
      body: invoice.invoice_items.map((item) => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.unit_price),
        formatCurrency(item.total_price),
      ]),
      foot: [
        ["", "", "Sous-total", formatCurrency(invoice.subtotal)],
        ...(invoice.tax_amount ? [["", "", "TVA", formatCurrency(invoice.tax_amount)]] : []),
        ["", "", "Total", formatCurrency(invoice.total)],
      ],
      theme: "striped",
      headStyles: { fillColor: [113, 75, 103] },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
    });

    // Notes
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    if (invoice.notes) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Notes:", 20, finalY);
      doc.text(invoice.notes, 20, finalY + 5);
    }

    // Footer
    const footerY = finalY + 25;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Outre-National - Paris, France", 20, footerY);
    doc.text("contact@outre-national.com", 20, footerY + 5);

    // Save
    doc.save(`${invoice.invoice_number}.pdf`);
  };

  // Delete invoice
  const handleDeleteInvoice = async () => {
    if (!deletingInvoice) return;
    
    setIsDeleting(true);
    try {
      // Delete invoice items first
      const { error: itemsError } = await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", deletingInvoice.id);

      if (itemsError) throw itemsError;

      // Then delete the invoice
      const { error: invoiceError } = await supabase
        .from("invoices")
        .delete()
        .eq("id", deletingInvoice.id);

      if (invoiceError) throw invoiceError;

      toast.success("Facture supprimée avec succès");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setDeletingInvoice(null);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Erreur lors de la suppression de la facture");
    } finally {
      setIsDeleting(false);
    }
  };

  // Duplicate invoice
  const handleDuplicateInvoice = async (invoice: InvoiceWithItems) => {
    try {
      // Generate new invoice number
      const newNumber = `${invoice.invoice_number}-COPIE`;
      
      // Create new invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: newNumber,
          type: invoice.type,
          recipient_name: invoice.recipient_name,
          recipient_email: invoice.recipient_email,
          recipient_address: invoice.recipient_address,
          issue_date: new Date().toISOString().split("T")[0],
          due_date: invoice.due_date,
          notes: invoice.notes,
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          total: invoice.total,
          status: "draft",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Duplicate invoice items
      const newItems = invoice.invoice_items.map((item) => ({
        invoice_id: newInvoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from("invoice_items")
        .insert(newItems);

      if (itemsError) throw itemsError;

      // Record history for duplicated invoice
      await addInvoiceHistory(newInvoice.id, "duplicated", {
        source_invoice: { old: null, new: invoice.invoice_number }
      });

      toast.success("Facture dupliquée avec succès");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (error) {
      console.error("Error duplicating invoice:", error);
      toast.error("Erreur lors de la duplication de la facture");
    }
  };

  // Mark invoice as paid
  const handleMarkAsPaid = async (invoice: InvoiceWithItems) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (error) throw error;

      // Record history
      await addInvoiceHistory(invoice.id, "status_changed", {
        status: { old: invoice.status, new: "paid" }
      });

      toast.success("Facture marquée comme payée");
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-history", invoice.id] });
    } catch (error) {
      console.error("Error marking invoice as paid:", error);
      toast.error("Erreur lors de la mise à jour de la facture");
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard icon={Euro} value={formatCurrency(stats.totalAmount)} label="Total facturé" variant="primary" />
        <KpiCard icon={CheckCircle} value={formatCurrency(stats.paidAmount)} label="Encaissé" variant="success" />
        <KpiCard icon={Clock} value={formatCurrency(stats.pendingAmount)} label="En attente" variant="warning" />
        <KpiCard icon={XCircle} value={stats.overdueCount.toString()} label="En retard" variant="danger" />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-3 flex-wrap">
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="customer">Factures clients</option>
            <option value="supplier_payout">Reversements fournisseurs</option>
          </select>
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="sent">Envoyée</option>
            <option value="paid">Payée</option>
            <option value="overdue">En retard</option>
            <option value="cancelled">Annulée</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher facture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="min-w-[200px] max-w-[300px] pl-9 pr-8 py-2 rounded-md border border-border bg-card text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-secondary transition-colors"
                title="Effacer la recherche"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportDropdowns
            onExportCSV={() => {
              const headers = ["Numéro", "Type", "Destinataire", "Email", "Statut", "Montant", "Date"];
              const rows = filteredInvoices.map(inv => [
                inv.invoice_number,
                inv.type === "customer" ? "Client" : "Fournisseur",
                `"${(inv.recipient_name || '').replace(/"/g, '""')}"`,
                inv.recipient_email || '',
                statusLabel[inv.status || "draft"],
                inv.total.toString(),
                inv.issue_date || ''
              ].join(";"));
              const csvContent = [headers.join(";"), ...rows].join("\n");
              const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `factures_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            canWrite={false}
            showHistory={false}
          />
          <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
            <Plus className="w-4 h-4" />
            Nouvelle facture
          </Button>
        </div>
      </div>

      {/* Invoice Form Modal */}
      <InvoiceFormModal open={isFormOpen} onOpenChange={setIsFormOpen} />
      
      {/* Invoice Edit Modal */}
      <InvoiceEditModal 
        open={!!editingInvoice} 
        onOpenChange={(open) => !open && setEditingInvoice(null)} 
        invoice={editingInvoice} 
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingInvoice} onOpenChange={(open) => !open && setDeletingInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la facture <strong>{deletingInvoice?.invoice_number}</strong> ? 
              Cette action est irréversible et supprimera également toutes les lignes associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteInvoice} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Detail Drawer */}
      <InvoiceDrawer
        open={!!viewingInvoice}
        onOpenChange={(open) => !open && setViewingInvoice(null)}
        invoice={viewingInvoice}
        onEdit={(inv) => setEditingInvoice(inv)}
        onDuplicate={handleDuplicateInvoice}
        onDownloadPDF={generatePDF}
        onMarkAsPaid={handleMarkAsPaid}
      />

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Facture</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Destinataire</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Statut</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Montant</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Date</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <tr 
                key={invoice.id} 
                className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => setViewingInvoice(invoice)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-semibold text-primary">{invoice.invoice_number}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${invoice.type === "customer" ? "bg-info-light text-info" : "bg-warning-light text-warning-foreground"}`}>
                    {invoice.type === "customer" ? "Client" : "Fournisseur"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium">{invoice.recipient_name}</div>
                    <div className="text-xs text-muted-foreground">{invoice.recipient_email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge variant={statusVariant[invoice.status || "draft"]}>
                    {statusLabel[invoice.status || "draft"]}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(invoice.total)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(invoice.issue_date)}</td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1">
                    {invoice.status !== "paid" && (
                      <button
                        onClick={() => handleMarkAsPaid(invoice)}
                        className="p-2 rounded-md hover:bg-success/10 transition-colors text-success"
                        title="Marquer comme payée"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingInvoice(invoice)}
                      className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                      title="Modifier"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDuplicateInvoice(invoice)}
                      className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                      title="Dupliquer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => generatePDF(invoice)}
                      className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                      title="Télécharger PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingInvoice(invoice)}
                      className="p-2 rounded-md hover:bg-destructive/10 transition-colors text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredInvoices.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            {invoices.length === 0 ? "Aucune facture enregistrée" : "Aucune facture trouvée pour cette recherche"}
          </div>
        )}
      </div>
    </div>
  );
}
