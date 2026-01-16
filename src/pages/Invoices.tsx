import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Euro, Clock, CheckCircle, XCircle, Download, Plus, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceFormModal } from "@/components/forms/InvoiceFormModal";
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
  cancelled: "primary",
};

const statusLabel: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

export function InvoicesPage() {
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

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
          </select>
          <input
            type="text"
            placeholder="Rechercher facture..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>
        <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Nouvelle facture
        </Button>
      </div>

      {/* Invoice Form Modal */}
      <InvoiceFormModal open={isFormOpen} onOpenChange={setIsFormOpen} />

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
              <tr key={invoice.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
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
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => generatePDF(invoice)}
                      className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                      title="Télécharger PDF"
                    >
                      <Download className="w-4 h-4" />
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
