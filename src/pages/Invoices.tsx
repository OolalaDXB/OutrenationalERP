import { useState, useMemo } from "react";
import { FileText, Euro, Clock, CheckCircle, XCircle, Download, Plus, Eye } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { orders, suppliers, formatCurrency, formatDate } from "@/data/demo-data";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: "customer" | "supplier";
  recipientName: string;
  recipientEmail: string;
  amount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  dueDate: string;
  createdAt: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
}

// Générer des factures depuis les données existantes
const generateInvoices = (): Invoice[] => {
  const invoices: Invoice[] = [];

  // Factures clients (depuis les commandes)
  orders.forEach((order, index) => {
    if (order.status !== "cancelled") {
      invoices.push({
        id: `inv-cust-${order.id}`,
        invoiceNumber: `FC-2026-${String(index + 1).padStart(4, "0")}`,
        type: "customer",
        recipientName: order.customerName,
        recipientEmail: order.customerEmail,
        amount: order.total,
        status: order.paymentStatus === "paid" ? "paid" : order.status === "pending" ? "sent" : "draft",
        dueDate: order.createdAt,
        createdAt: order.createdAt,
        items: order.items.map((item) => ({
          description: `${item.productTitle} - ${item.artist}`,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    }
  });

  // Factures fournisseurs (reversements dépôt-vente)
  suppliers
    .filter((s) => s.type === "consignment" && s.pendingPayout > 0)
    .forEach((supplier, index) => {
      invoices.push({
        id: `inv-sup-${supplier.id}`,
        invoiceNumber: `FF-2026-${String(index + 1).padStart(4, "0")}`,
        type: "supplier",
        recipientName: supplier.name,
        recipientEmail: supplier.email || "",
        amount: supplier.pendingPayout,
        status: "draft",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        items: [{ description: "Reversement dépôt-vente période en cours", quantity: 1, unitPrice: supplier.pendingPayout }],
      });
    });

  return invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const invoices = generateInvoices();

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Filtrage
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const matchesSearch =
        searchTerm === "" ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.recipientName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      const matchesType = typeFilter === "all" || invoice.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchTerm, statusFilter, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalAmount = invoices.reduce((sum, i) => sum + i.amount, 0);
    const paidAmount = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
    const pendingAmount = invoices.filter((i) => i.status === "sent" || i.status === "draft").reduce((sum, i) => sum + i.amount, 0);
    const overdueCount = invoices.filter((i) => i.status === "overdue").length;

    return { totalAmount, paidAmount, pendingAmount, overdueCount };
  }, []);

  // Génération PDF
  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(113, 75, 103); // Primary color
    doc.text("OUTRE-NATIONAL", 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Distribution de vinyles", 20, 32);

    // Invoice info
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(`Facture ${invoice.invoiceNumber}`, 120, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${formatDate(invoice.createdAt)}`, 120, 35);
    doc.text(`Échéance: ${formatDate(invoice.dueDate)}`, 120, 42);

    // Recipient
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Destinataire:", 20, 55);
    doc.setFontSize(10);
    doc.text(invoice.recipientName, 20, 62);
    if (invoice.recipientEmail) {
      doc.text(invoice.recipientEmail, 20, 69);
    }

    // Table
    autoTable(doc, {
      startY: 85,
      head: [["Description", "Qté", "Prix unit.", "Total"]],
      body: invoice.items.map((item) => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.unitPrice),
        formatCurrency(item.quantity * item.unitPrice),
      ]),
      foot: [["", "", "Total", formatCurrency(invoice.amount)]],
      theme: "striped",
      headStyles: { fillColor: [113, 75, 103] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text("Outre-National - Paris, France", 20, finalY);
    doc.text("contact@outre-national.com", 20, finalY + 5);

    // Save
    doc.save(`${invoice.invoiceNumber}.pdf`);
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
            <option value="supplier">Factures fournisseurs</option>
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
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle facture
        </Button>
      </div>

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
                    <span className="font-semibold text-primary">{invoice.invoiceNumber}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${invoice.type === "customer" ? "bg-info-light text-info" : "bg-warning-light text-warning-foreground"}`}>
                    {invoice.type === "customer" ? "Client" : "Fournisseur"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium">{invoice.recipientName}</div>
                    <div className="text-xs text-muted-foreground">{invoice.recipientEmail}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge variant={statusVariant[invoice.status]}>
                    {statusLabel[invoice.status]}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(invoice.amount)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(invoice.createdAt)}</td>
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
            Aucune facture trouvée
          </div>
        )}
      </div>
    </div>
  );
}
