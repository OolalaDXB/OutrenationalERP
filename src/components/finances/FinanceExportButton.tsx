import { useState } from "react";
import { format } from "date-fns";
import { Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToXLS } from "@/lib/excel-utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Define types locally to avoid circular dependency
interface MonthlyRevenueRow {
  month: string;
  revenue_ht: number;
  tva_collected: number;
  invoice_count: number;
}

interface TvaBreakdownItem {
  rate: string;
  baseHT: number;
  tvaAmount: number;
}
interface FinanceExportButtonProps {
  kpis: {
    revenueHT: number;
    grossMargin: number;
    marginPercent: number;
    tvaCollected: number;
    invoiceCount: number;
    avgBasket: number;
    unpaidTotal: number;
    unpaidCount: number;
    overdueTotal: number;
    overdueCount: number;
  } | undefined;
  monthlyRevenue: MonthlyRevenueRow[] | undefined;
  tvaBreakdown: TvaBreakdownItem[] | undefined;
  periodLabel: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

const TVA_LABELS: Record<string, string> = {
  "20": "TVA 20%",
  "5.5": "TVA 5.5%",
  "0": "TVA 0% (Export/Intra.)",
  "other": "Autre",
};

export function FinanceExportButton({ kpis, monthlyRevenue, tvaBreakdown, periodLabel }: FinanceExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportKPIsExcel = () => {
    if (!kpis) return;
    
    const data = [
      { metric: "Chiffre d'affaires HT", value: kpis.revenueHT, formatted: formatCurrency(kpis.revenueHT) },
      { metric: "Marge brute", value: kpis.grossMargin, formatted: formatCurrency(kpis.grossMargin) },
      { metric: "Marge (%)", value: kpis.marginPercent, formatted: `${kpis.marginPercent.toFixed(1)}%` },
      { metric: "TVA collectée", value: kpis.tvaCollected, formatted: formatCurrency(kpis.tvaCollected) },
      { metric: "Nombre de factures", value: kpis.invoiceCount, formatted: String(kpis.invoiceCount) },
      { metric: "Panier moyen", value: kpis.avgBasket, formatted: formatCurrency(kpis.avgBasket) },
      { metric: "Impayés total", value: kpis.unpaidTotal, formatted: formatCurrency(kpis.unpaidTotal) },
      { metric: "Impayés en retard", value: kpis.overdueTotal, formatted: formatCurrency(kpis.overdueTotal) },
    ];

    exportToXLS(data, [
      { key: 'metric', header: 'Indicateur' },
      { key: 'formatted', header: 'Valeur' },
    ], `kpis-finances-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportMonthlyExcel = () => {
    if (!monthlyRevenue) return;

    const data = monthlyRevenue.map(row => ({
      month: row.month,
      revenue_ht: row.revenue_ht,
      tva_collected: row.tva_collected,
      invoice_count: row.invoice_count,
    }));

    exportToXLS(data, [
      { key: 'month', header: 'Mois' },
      { key: 'revenue_ht', header: 'CA HT (€)' },
      { key: 'tva_collected', header: 'TVA (€)' },
      { key: 'invoice_count', header: 'Nb Factures' },
    ], `ca-mensuel-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportTvaExcel = () => {
    if (!tvaBreakdown) return;

    const data = tvaBreakdown.map(row => ({
      rate: TVA_LABELS[row.rate] || `TVA ${row.rate}%`,
      base_ht: row.baseHT,
      tva_amount: row.tvaAmount,
    }));

    exportToXLS(data, [
      { key: 'rate', header: 'Taux TVA' },
      { key: 'base_ht', header: 'Base HT (€)' },
      { key: 'tva_amount', header: 'TVA (€)' },
    ], `tva-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("Rapport Financier", pageWidth / 2, 20, { align: "center" });
      
      // Period
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Période: ${periodLabel}`, pageWidth / 2, 30, { align: "center" });
      doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 36, { align: "center" });
      
      let yPos = 50;

      // KPIs Section
      if (kpis) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Indicateurs clés", 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [["Indicateur", "Valeur"]],
          body: [
            ["Chiffre d'affaires HT", formatCurrency(kpis.revenueHT)],
            ["Marge brute", formatCurrency(kpis.grossMargin)],
            ["Marge (%)", `${kpis.marginPercent.toFixed(1)}%`],
            ["TVA collectée", formatCurrency(kpis.tvaCollected)],
            ["Nombre de factures", String(kpis.invoiceCount)],
            ["Panier moyen", formatCurrency(kpis.avgBasket)],
            ["Impayés total", formatCurrency(kpis.unpaidTotal)],
            ["Impayés en retard", formatCurrency(kpis.overdueTotal)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [113, 75, 103] },
        });

        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
      }

      // Monthly Revenue
      if (monthlyRevenue && monthlyRevenue.length > 0) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("CA Mensuel (12 derniers mois)", 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [["Mois", "CA HT", "TVA", "Nb Factures"]],
          body: monthlyRevenue.map(row => [
            format(new Date(row.month), 'MMM yyyy'),
            formatCurrency(row.revenue_ht),
            formatCurrency(row.tva_collected),
            String(row.invoice_count),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [113, 75, 103] },
        });

        yPos = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
      }

      // TVA Breakdown
      if (tvaBreakdown && tvaBreakdown.length > 0) {
        // Check if we need a new page
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Répartition TVA", 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [["Taux", "Base HT", "TVA"]],
          body: tvaBreakdown.map(row => [
            TVA_LABELS[row.rate] || `TVA ${row.rate}%`,
            formatCurrency(row.baseHT),
            formatCurrency(row.tvaAmount),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [113, 75, 103] },
        });
      }

      doc.save(`rapport-financier-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={isExporting}>
          <Download className="h-4 w-4" />
          Exporter
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleExportPDF} disabled={!kpis}>
          <FileText className="h-4 w-4 mr-2" />
          Rapport complet (PDF)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportKPIsExcel} disabled={!kpis}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          KPIs (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportMonthlyExcel} disabled={!monthlyRevenue}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          CA mensuel (Excel)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportTvaExcel} disabled={!tvaBreakdown}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Répartition TVA (Excel)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
