import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { fr } from "date-fns/locale";
import { FileSpreadsheet, FileText, Download, Calendar, X, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface SupplierSalesData {
  supplier_id: string;
  supplier_name: string;
  supplier_type: string;
  gross_sales: number;
  items_sold: number;
  supplier_due: number;
  our_margin: number;
  commission_rate: number;
}

interface OrderItem {
  id: string;
  title: string;
  artist_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_id?: string;
  created_at?: string;
}

interface SupplierSalesReportProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: { id: string; name: string; type: string; commission_rate?: number }[];
  orderItems: OrderItem[];
}

type PeriodPreset = "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";

export function SupplierSalesReport({ isOpen, onClose, suppliers, orderItems }: SupplierSalesReportProps) {
  const { toast } = useToast();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("this_month");
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Update dates when preset changes
  const handlePresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    const now = new Date();
    
    switch (preset) {
      case "this_month":
        setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        setStartDate(format(startOfMonth(lastMonth), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(lastMonth), "yyyy-MM-dd"));
        break;
      case "this_quarter":
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        setStartDate(format(quarterStart, "yyyy-MM-dd"));
        setEndDate(format(quarterEnd, "yyyy-MM-dd"));
        break;
      case "this_year":
        setStartDate(format(startOfYear(now), "yyyy-MM-dd"));
        setEndDate(format(endOfYear(now), "yyyy-MM-dd"));
        break;
      case "custom":
        // Keep current dates
        break;
    }
  };

  // Filter and compute sales data
  const salesData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredItems = orderItems.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      return itemDate >= start && itemDate <= end;
    });

    const supplierSales: Record<string, SupplierSalesData> = {};

    filteredItems.forEach(item => {
      const supplierId = item.supplier_id;
      if (!supplierId) return;
      
      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) return;

      if (selectedSupplier !== "all" && supplierId !== selectedSupplier) return;

      if (!supplierSales[supplierId]) {
        supplierSales[supplierId] = {
          supplier_id: supplierId,
          supplier_name: supplier.name,
          supplier_type: supplier.type,
          gross_sales: 0,
          items_sold: 0,
          supplier_due: 0,
          our_margin: 0,
          commission_rate: supplier.commission_rate || 0,
        };
      }

      const saleAmount = item.total_price;
      supplierSales[supplierId].gross_sales += saleAmount;
      supplierSales[supplierId].items_sold += item.quantity;

      // Calculate supplier due and our margin based on type
      if (supplier.type === "consignment" || supplier.type === "depot_vente") {
        const commissionRate = supplier.commission_rate || 0;
        const ourCut = saleAmount * commissionRate;
        const supplierCut = saleAmount - ourCut;
        supplierSales[supplierId].our_margin += ourCut;
        supplierSales[supplierId].supplier_due += supplierCut;
      } else {
        // For purchase/own, all margin is ours
        supplierSales[supplierId].our_margin += saleAmount;
        supplierSales[supplierId].supplier_due = 0;
      }
    });

    return Object.values(supplierSales).sort((a, b) => b.gross_sales - a.gross_sales);
  }, [orderItems, suppliers, startDate, endDate, selectedSupplier]);

  const totals = useMemo(() => ({
    gross_sales: salesData.reduce((sum, s) => sum + s.gross_sales, 0),
    items_sold: salesData.reduce((sum, s) => sum + s.items_sold, 0),
    supplier_due: salesData.reduce((sum, s) => sum + s.supplier_due, 0),
    our_margin: salesData.reduce((sum, s) => sum + s.our_margin, 0),
  }), [salesData]);

  const periodLabel = `${format(new Date(startDate), "d MMM yyyy", { locale: fr })} - ${format(new Date(endDate), "d MMM yyyy", { locale: fr })}`;

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const wsData = [
        ["Relevé de ventes fournisseurs"],
        [`Période: ${periodLabel}`],
        [],
        ["Fournisseur", "Type", "Articles vendus", "CA brut", "Commission %", "À reverser", "Marge ON"],
        ...salesData.map(s => [
          s.supplier_name,
          supplierTypeLabel[s.supplier_type] || s.supplier_type,
          s.items_sold,
          s.gross_sales,
          (s.commission_rate * 100).toFixed(0) + "%",
          s.supplier_due,
          s.our_margin,
        ]),
        [],
        ["TOTAL", "", totals.items_sold, totals.gross_sales, "", totals.supplier_due, totals.our_margin],
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 30 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Ventes Fournisseurs");
      XLSX.writeFile(wb, `ventes-fournisseurs-${format(new Date(), "yyyy-MM-dd")}.xlsx`);

      toast({ title: "Export réussi", description: "Le fichier Excel a été téléchargé" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'exporter en Excel", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text("Relevé de ventes fournisseurs", 14, 22);
      
      // Period
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Période: ${periodLabel}`, 14, 30);
      doc.text(`Généré le: ${format(new Date(), "d MMMM yyyy", { locale: fr })}`, 14, 36);
      
      // Table
      autoTable(doc, {
        startY: 45,
        head: [["Fournisseur", "Type", "Articles", "CA brut", "Comm. %", "À reverser", "Marge ON"]],
        body: salesData.map(s => [
          s.supplier_name,
          supplierTypeLabel[s.supplier_type] || s.supplier_type,
          s.items_sold.toString(),
          formatCurrency(s.gross_sales),
          (s.commission_rate * 100).toFixed(0) + "%",
          formatCurrency(s.supplier_due),
          formatCurrency(s.our_margin),
        ]),
        foot: [["TOTAL", "", totals.items_sold.toString(), formatCurrency(totals.gross_sales), "", formatCurrency(totals.supplier_due), formatCurrency(totals.our_margin)]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [113, 75, 103] },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
      });

      doc.save(`ventes-fournisseurs-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      
      toast({ title: "Export réussi", description: "Le fichier PDF a été téléchargé" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'exporter en PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-4xl mx-4 animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Relevé de ventes fournisseurs</h2>
              <p className="text-sm text-muted-foreground">{periodLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-border bg-secondary/30 space-y-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Period preset */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Période</Label>
              <select
                value={periodPreset}
                onChange={(e) => handlePresetChange(e.target.value as PeriodPreset)}
                className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
              >
                <option value="this_month">Ce mois</option>
                <option value="last_month">Mois dernier</option>
                <option value="this_quarter">Ce trimestre</option>
                <option value="this_year">Cette année</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>

            {/* Date range */}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Du</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPeriodPreset("custom"); }}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Au</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPeriodPreset("custom"); }}
                className="mt-1.5"
              />
            </div>

            {/* Supplier filter */}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium text-muted-foreground">Fournisseur</Label>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
              >
                <option value="all">Tous les fournisseurs</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Export buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToExcel} disabled={isExporting || salesData.length === 0}>
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                <span className="ml-1">Excel</span>
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF} disabled={isExporting || salesData.length === 0}>
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                <span className="ml-1">PDF</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {salesData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Aucune vente sur cette période</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left py-3 px-4 font-medium">Fournisseur</th>
                  <th className="text-center py-3 px-4 font-medium">Type</th>
                  <th className="text-right py-3 px-4 font-medium">Articles</th>
                  <th className="text-right py-3 px-4 font-medium">CA brut</th>
                  <th className="text-right py-3 px-4 font-medium">Commission</th>
                  <th className="text-right py-3 px-4 font-medium">À reverser</th>
                  <th className="text-right py-3 px-4 font-medium">Marge ON</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((data) => (
                  <tr key={data.supplier_id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-4 font-medium">{data.supplier_name}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge variant={supplierTypeVariant[data.supplier_type] || "primary"}>
                        {supplierTypeLabel[data.supplier_type] || data.supplier_type}
                      </StatusBadge>
                    </td>
                    <td className="py-3 px-4 text-right">{data.items_sold}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(data.gross_sales)}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {(data.commission_rate * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-right text-info font-medium">
                      {formatCurrency(data.supplier_due)}
                    </td>
                    <td className="py-3 px-4 text-right text-success font-medium">
                      {formatCurrency(data.our_margin)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-secondary/50 font-semibold">
                  <td className="py-3 px-4">Total</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-right">{totals.items_sold}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(totals.gross_sales)}</td>
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 text-right text-info">{formatCurrency(totals.supplier_due)}</td>
                  <td className="py-3 px-4 text-right text-success">{formatCurrency(totals.our_margin)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
