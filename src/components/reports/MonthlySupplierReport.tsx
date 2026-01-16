import { useState, useMemo, useCallback } from "react";
import { format, startOfMonth, endOfMonth, subMonths, eachMonthOfInterval, subYears, startOfYear, endOfYear, parseISO, differenceInDays, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { FileText, X, Building2, Loader2, TrendingUp, TrendingDown, Package, Euro, Percent, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

const COLORS = ["#714B67", "#9B7A91", "#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

interface OrderItem {
  id: string;
  title: string;
  artist_name?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  supplier_id?: string;
  supplier_name?: string;
  supplier_type?: string;
  consignment_rate?: number;
  created_at?: string;
}

interface Supplier {
  id: string;
  name: string;
  type: string;
  commission_rate?: number;
}

interface MonthlySupplierReportProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  orderItems: OrderItem[];
}

interface SupplierMonthlyData {
  supplier_id: string;
  supplier_name: string;
  supplier_type: string;
  gross_sales: number;
  items_sold: number;
  supplier_due: number;
  our_margin: number;
  commission_rate: number;
}

// Evolution badge component
function EvolutionBadge({ value, inverted = false, suffix = "%" }: { value: number; inverted?: boolean; suffix?: string }) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNegative = inverted ? value > 0 : value < 0;
  const isNeutral = value === 0;

  if (isNeutral) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
        <Minus className="w-3 h-3" />
        <span>0{suffix}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 text-xs mt-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
      {value > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      <span>{value > 0 ? "+" : ""}{value.toFixed(1)}{suffix}</span>
    </div>
  );
}

type PeriodPreset = "this_month" | "last_month" | "this_quarter" | "this_year" | "last_year" | "custom";

export function MonthlySupplierReport({ isOpen, onClose, suppliers, orderItems }: MonthlySupplierReportProps) {
  const { toast } = useToast();
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("this_month");
  const [customStartDate, setCustomStartDate] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEndDate, setCustomEndDate] = useState<string>(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [isExporting, setIsExporting] = useState(false);

  // Calculate date range based on period preset
  const { periodStart, periodEnd, periodLabel } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;
    let label: string;

    switch (periodPreset) {
      case "this_month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        label = format(now, "MMMM yyyy", { locale: fr });
        break;
      case "last_month":
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        label = format(lastMonth, "MMMM yyyy", { locale: fr });
        break;
      case "this_quarter":
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
        start = quarterStart;
        end = quarterEnd;
        const quarterNum = Math.floor(now.getMonth() / 3) + 1;
        label = `T${quarterNum} ${now.getFullYear()}`;
        break;
      case "this_year":
        start = startOfYear(now);
        end = endOfYear(now);
        label = `Année ${now.getFullYear()}`;
        break;
      case "last_year":
        const lastYear = subYears(now, 1);
        start = startOfYear(lastYear);
        end = endOfYear(lastYear);
        label = `Année ${lastYear.getFullYear()}`;
        break;
      case "custom":
        start = customStartDate ? parseISO(customStartDate) : startOfMonth(now);
        end = customEndDate ? parseISO(customEndDate) : endOfMonth(now);
        label = `${format(start, "d MMM yyyy", { locale: fr })} - ${format(end, "d MMM yyyy", { locale: fr })}`;
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
        label = format(now, "MMMM yyyy", { locale: fr });
    }

    return { periodStart: start, periodEnd: end, periodLabel: label };
  }, [periodPreset, customStartDate, customEndDate]);

  // Calculate previous period for comparison
  const { prevPeriodStart, prevPeriodEnd, prevPeriodLabel } = useMemo(() => {
    const periodDuration = differenceInDays(periodEnd, periodStart) + 1;
    const prevEnd = subDays(periodStart, 1);
    const prevStart = subDays(prevEnd, periodDuration - 1);
    const label = `${format(prevStart, "d MMM", { locale: fr })} - ${format(prevEnd, "d MMM yyyy", { locale: fr })}`;
    return { prevPeriodStart: prevStart, prevPeriodEnd: prevEnd, prevPeriodLabel: label };
  }, [periodStart, periodEnd]);

  // Filter order items for the selected period
  const filteredItems = useMemo(() => {
    return orderItems.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      return itemDate >= periodStart && itemDate <= periodEnd;
    });
  }, [orderItems, periodStart, periodEnd]);

  // Filter order items for the previous period
  const prevFilteredItems = useMemo(() => {
    return orderItems.filter(item => {
      if (!item.created_at) return false;
      const itemDate = new Date(item.created_at);
      return itemDate >= prevPeriodStart && itemDate <= prevPeriodEnd;
    });
  }, [orderItems, prevPeriodStart, prevPeriodEnd]);

  // Calculate sales by supplier for the period
  const supplierSalesData = useMemo(() => {
    const salesBySupplier: Record<string, SupplierMonthlyData> = {};

    filteredItems.forEach(item => {
      const supplierId = item.supplier_id;
      if (!supplierId) return;

      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) return;

      if (!salesBySupplier[supplierId]) {
        salesBySupplier[supplierId] = {
          supplier_id: supplierId,
          supplier_name: supplier.name,
          supplier_type: supplier.type,
          gross_sales: 0,
          items_sold: 0,
          supplier_due: 0,
          our_margin: 0,
          commission_rate: supplier.commission_rate || item.consignment_rate || 0,
        };
      }

      const saleAmount = item.total_price;
      salesBySupplier[supplierId].gross_sales += saleAmount;
      salesBySupplier[supplierId].items_sold += item.quantity;

      if (supplier.type === "consignment" || supplier.type === "depot_vente") {
        const rate = supplier.commission_rate || item.consignment_rate || 0;
        const ourCut = saleAmount * rate;
        salesBySupplier[supplierId].our_margin += ourCut;
        salesBySupplier[supplierId].supplier_due += saleAmount - ourCut;
      } else {
        salesBySupplier[supplierId].our_margin += saleAmount;
      }
    });

    return Object.values(salesBySupplier).sort((a, b) => b.gross_sales - a.gross_sales);
  }, [filteredItems, suppliers]);

  // Current period totals
  const totals = useMemo(() => ({
    gross_sales: supplierSalesData.reduce((sum, s) => sum + s.gross_sales, 0),
    items_sold: supplierSalesData.reduce((sum, s) => sum + s.items_sold, 0),
    supplier_due: supplierSalesData.reduce((sum, s) => sum + s.supplier_due, 0),
    our_margin: supplierSalesData.reduce((sum, s) => sum + s.our_margin, 0),
    supplier_count: supplierSalesData.length,
  }), [supplierSalesData]);

  // Previous period totals for comparison
  const prevTotals = useMemo(() => {
    let gross_sales = 0;
    let items_sold = 0;
    let supplier_due = 0;
    let our_margin = 0;

    prevFilteredItems.forEach(item => {
      const supplierId = item.supplier_id;
      if (!supplierId) return;

      const supplier = suppliers.find(s => s.id === supplierId);
      if (!supplier) return;

      const saleAmount = item.total_price;
      gross_sales += saleAmount;
      items_sold += item.quantity;

      if (supplier.type === "consignment" || supplier.type === "depot_vente") {
        const rate = supplier.commission_rate || item.consignment_rate || 0;
        const ourCut = saleAmount * rate;
        our_margin += ourCut;
        supplier_due += saleAmount - ourCut;
      } else {
        our_margin += saleAmount;
      }
    });

    return { gross_sales, items_sold, supplier_due, our_margin };
  }, [prevFilteredItems, suppliers]);

  // Calculate evolution percentages
  const evolution = useMemo(() => {
    const calcEvolution = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      gross_sales: calcEvolution(totals.gross_sales, prevTotals.gross_sales),
      items_sold: calcEvolution(totals.items_sold, prevTotals.items_sold),
      supplier_due: calcEvolution(totals.supplier_due, prevTotals.supplier_due),
      our_margin: calcEvolution(totals.our_margin, prevTotals.our_margin),
    };
  }, [totals, prevTotals]);

  // Margin percentage calculations
  const marginPercentage = totals.gross_sales > 0 
    ? ((totals.our_margin / totals.gross_sales) * 100).toFixed(1) 
    : "0";

  const prevMarginPercentage = prevTotals.gross_sales > 0 
    ? ((prevTotals.our_margin / prevTotals.gross_sales) * 100)
    : 0;

  const marginEvolution = parseFloat(marginPercentage) - prevMarginPercentage;

  // Chart data - Top suppliers by sales
  const topSuppliersChart = useMemo(() => {
    return supplierSalesData.slice(0, 8).map(s => ({
      name: s.supplier_name.length > 12 ? s.supplier_name.substring(0, 12) + '...' : s.supplier_name,
      fullName: s.supplier_name,
      sales: s.gross_sales,
      margin: s.our_margin,
    }));
  }, [supplierSalesData]);

  // Sales by supplier type
  const salesByType = useMemo(() => {
    const byType: Record<string, number> = {};
    supplierSalesData.forEach(s => {
      const typeLabel = supplierTypeLabel[s.supplier_type as keyof typeof supplierTypeLabel] || s.supplier_type;
      byType[typeLabel] = (byType[typeLabel] || 0) + s.gross_sales;
    });
    return Object.entries(byType).map(([name, value]) => ({ name, value }));
  }, [supplierSalesData]);

  // Comparative chart data - Current vs Previous period
  const comparisonChartData = useMemo(() => {
    return [
      {
        name: "CA Brut",
        current: totals.gross_sales,
        previous: prevTotals.gross_sales,
      },
      {
        name: "Marge ON",
        current: totals.our_margin,
        previous: prevTotals.our_margin,
      },
      {
        name: "À reverser",
        current: totals.supplier_due,
        previous: prevTotals.supplier_due,
      },
    ];
  }, [totals, prevTotals]);

  // Monthly trend (based on period)
  const monthlyTrend = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(periodStart, 5),
      end: periodStart
    });

    return months.map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      
      const monthItems = orderItems.filter(item => {
        if (!item.created_at) return false;
        const itemDate = new Date(item.created_at);
        return itemDate >= mStart && itemDate <= mEnd;
      });

      const sales = monthItems.reduce((sum, item) => sum + item.total_price, 0);
      
      return {
        month: format(month, "MMM", { locale: fr }),
        sales,
      };
    });
  }, [orderItems, periodStart]);

  // Export to PDF
  const exportToPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(113, 75, 103);
      doc.text("Rapport mensuel des ventes", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.setTextColor(60);
      doc.text(periodLabel.toUpperCase(), pageWidth / 2, 28, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Généré le ${format(new Date(), "d MMMM yyyy à HH:mm", { locale: fr })}`, pageWidth / 2, 35, { align: "center" });

      // KPI Summary
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 42, pageWidth - 28, 25, "F");
      
      doc.setFontSize(11);
      doc.setTextColor(60);
      const kpiY = 52;
      const kpiSpacing = (pageWidth - 28) / 4;
      
      doc.setFontSize(16);
      doc.setTextColor(34, 197, 94);
      doc.text(formatCurrency(totals.gross_sales), 14 + kpiSpacing * 0.5, kpiY, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("CA Brut", 14 + kpiSpacing * 0.5, kpiY + 8, { align: "center" });
      
      doc.setFontSize(16);
      doc.setTextColor(113, 75, 103);
      doc.text(formatCurrency(totals.our_margin), 14 + kpiSpacing * 1.5, kpiY, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Marge ON", 14 + kpiSpacing * 1.5, kpiY + 8, { align: "center" });
      
      doc.setFontSize(16);
      doc.setTextColor(59, 130, 246);
      doc.text(formatCurrency(totals.supplier_due), 14 + kpiSpacing * 2.5, kpiY, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("À reverser", 14 + kpiSpacing * 2.5, kpiY + 8, { align: "center" });
      
      doc.setFontSize(16);
      doc.setTextColor(60);
      doc.text(`${marginPercentage}%`, 14 + kpiSpacing * 3.5, kpiY, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text("Taux marge", 14 + kpiSpacing * 3.5, kpiY + 8, { align: "center" });

      // Supplier sales table
      doc.setFontSize(12);
      doc.setTextColor(60);
      doc.text("Détail par fournisseur", 14, 78);

      autoTable(doc, {
        startY: 82,
        head: [["Fournisseur", "Type", "Articles", "CA brut", "Comm.", "À reverser", "Marge"]],
        body: supplierSalesData.map(s => [
          s.supplier_name,
          supplierTypeLabel[s.supplier_type as keyof typeof supplierTypeLabel] || s.supplier_type,
          s.items_sold.toString(),
          formatCurrency(s.gross_sales),
          `${(s.commission_rate * 100).toFixed(0)}%`,
          formatCurrency(s.supplier_due),
          formatCurrency(s.our_margin),
        ]),
        foot: [[
          "TOTAL",
          `${totals.supplier_count} fournisseurs`,
          totals.items_sold.toString(),
          formatCurrency(totals.gross_sales),
          "",
          formatCurrency(totals.supplier_due),
          formatCurrency(totals.our_margin),
        ]],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [113, 75, 103], textColor: 255, fontStyle: "bold" },
        footStyles: { fillColor: [240, 240, 240], textColor: [60, 60, 60], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: {
          0: { cellWidth: 45 },
          1: { cellWidth: 25 },
          2: { cellWidth: 18, halign: "center" },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 18, halign: "center" },
          5: { cellWidth: 28, halign: "right" },
          6: { cellWidth: 28, halign: "right" },
        },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Outre-National - Rapport mensuel ${periodLabel} - Page ${i}/${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      const fileName = `rapport-ventes-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      
      toast({ title: "Export réussi", description: `Le rapport a été téléchargé` });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Erreur", description: "Impossible de générer le rapport PDF", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  }, [supplierSalesData, totals, marginPercentage, periodLabel, toast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-6xl mx-4 animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Rapport des ventes</h2>
              <p className="text-sm text-muted-foreground">Analyse par fournisseur</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={exportToPDF} disabled={isExporting || supplierSalesData.length === 0} className="gap-2">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Exporter PDF
            </Button>

            <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Period Selection */}
        <div className="p-4 border-b border-border bg-secondary/30">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1.5">Période</label>
              <select
                value={periodPreset}
                onChange={(e) => setPeriodPreset(e.target.value as PeriodPreset)}
                className="px-3 py-2 rounded-lg border border-border bg-card text-sm cursor-pointer min-w-[160px]"
              >
                <option value="this_month">Ce mois</option>
                <option value="last_month">Mois dernier</option>
                <option value="this_quarter">Ce trimestre</option>
                <option value="this_year">Cette année</option>
                <option value="last_year">Année dernière</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>

            {periodPreset === "custom" && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Du</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1.5">Au</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-auto"
                  />
                </div>
              </>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{periodLabel}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* KPI Cards with Evolution */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Euro className="w-4 h-4" />
                <span className="text-sm font-medium">CA Brut</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(totals.gross_sales)}</div>
              <EvolutionBadge value={evolution.gross_sales} />
            </div>
            
            <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-xl p-4 border border-success/20">
              <div className="flex items-center gap-2 text-success mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Marge ON</span>
              </div>
              <div className="text-2xl font-bold text-success">{formatCurrency(totals.our_margin)}</div>
              <EvolutionBadge value={evolution.our_margin} />
            </div>
            
            <div className="bg-gradient-to-br from-info/10 to-info/5 rounded-xl p-4 border border-info/20">
              <div className="flex items-center gap-2 text-info mb-2">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">À reverser</span>
              </div>
              <div className="text-2xl font-bold text-info">{formatCurrency(totals.supplier_due)}</div>
              <EvolutionBadge value={evolution.supplier_due} inverted />
            </div>
            
            <div className="bg-gradient-to-br from-warning/10 to-warning/5 rounded-xl p-4 border border-warning/20">
              <div className="flex items-center gap-2 text-warning-foreground mb-2">
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">Articles vendus</span>
              </div>
              <div className="text-2xl font-bold">{totals.items_sold}</div>
              <EvolutionBadge value={evolution.items_sold} />
            </div>
            
            <div className="bg-gradient-to-br from-secondary to-secondary/50 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Percent className="w-4 h-4" />
                <span className="text-sm font-medium">Taux de marge</span>
              </div>
              <div className="text-2xl font-bold">{marginPercentage}%</div>
              <EvolutionBadge value={marginEvolution} suffix="pts" />
            </div>
          </div>

          {/* Previous period info */}
          <div className="text-xs text-muted-foreground text-center">
            Comparaison avec la période précédente : {prevPeriodLabel}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar chart - Top suppliers */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold mb-4">Top fournisseurs par CA</h3>
              {topSuppliersChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topSuppliersChart} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} width={80} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number, name: string) => [formatCurrency(value), name === "sales" ? "CA" : "Marge"]}
                      labelFormatter={(label) => topSuppliersChart.find(d => d.name === label)?.fullName || label}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée pour ce mois
                </div>
              )}
            </div>

            {/* Pie chart - Sales by type */}
            <div className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold mb-4">Répartition par type</h3>
              {salesByType.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={salesByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {salesByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée
                </div>
              )}
            </div>
          </div>

          {/* Comparison chart - Current vs Previous period */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-2">Comparaison avec la période précédente</h3>
            <p className="text-xs text-muted-foreground mb-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-primary"></span>
                {periodLabel}
              </span>
              <span className="mx-3">vs</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-muted-foreground/50"></span>
                {prevPeriodLabel}
              </span>
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={comparisonChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === "current" ? periodLabel : prevPeriodLabel]}
                />
                <Bar dataKey="previous" fill="hsl(var(--muted-foreground) / 0.4)" radius={[0, 4, 4, 0]} name={prevPeriodLabel} />
                <Bar dataKey="current" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name={periodLabel} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly trend */}
          <div className="bg-card rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold mb-4">Évolution sur 6 mois</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  formatter={(value: number) => [formatCurrency(value), "CA"]}
                />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-secondary/30">
              <h3 className="text-sm font-semibold">Détail par fournisseur</h3>
            </div>
            {supplierSalesData.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Aucune vente enregistrée pour {periodLabel}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                    {supplierSalesData.map((data) => (
                      <tr key={data.supplier_id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-4 font-medium">{data.supplier_name}</td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge variant={supplierTypeVariant[data.supplier_type as keyof typeof supplierTypeVariant] || "primary"}>
                            {supplierTypeLabel[data.supplier_type as keyof typeof supplierTypeLabel] || data.supplier_type}
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
                      <td className="py-3 px-4">Total ({totals.supplier_count} fournisseurs)</td>
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 text-right">{totals.items_sold}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(totals.gross_sales)}</td>
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 text-right text-info">{formatCurrency(totals.supplier_due)}</td>
                      <td className="py-3 px-4 text-right text-success">{formatCurrency(totals.our_margin)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
