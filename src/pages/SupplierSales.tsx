import { useMemo, useState } from "react";
import { Euro, Package, ArrowUpRight, ArrowDownRight, Download, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { useSupplierSalesView } from "@/hooks/useDashboard";
import { useSuppliers } from "@/hooks/useSuppliers";
import { formatCurrency } from "@/lib/format";

export function SupplierSalesPage() {
  const { data: supplierSales = [], isLoading: salesLoading } = useSupplierSalesView();
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  const isLoading = salesLoading || suppliersLoading;

  // Totaux globaux
  const totals = useMemo(() => {
    return supplierSales.reduce(
      (acc, r) => ({
        totalSales: acc.totalSales + (r.gross_sales ?? 0),
        totalItems: acc.totalItems + (r.items_sold ?? 0),
        totalSupplierDue: acc.totalSupplierDue + (r.supplier_due ?? 0),
        totalMargin: acc.totalMargin + (r.our_margin ?? 0),
      }),
      { totalSales: 0, totalItems: 0, totalSupplierDue: 0, totalMargin: 0 }
    );
  }, [supplierSales]);

  const marginPercentage = totals.totalSales > 0 
    ? ((totals.totalMargin / totals.totalSales) * 100).toFixed(1) 
    : "0";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          icon={Euro} 
          value={formatCurrency(totals.totalSales)} 
          label="CA Total" 
          variant="primary"
        />
        <KpiCard 
          icon={Package} 
          value={totals.totalItems.toString()} 
          label="Articles vendus" 
          variant="info"
        />
        <KpiCard 
          icon={ArrowUpRight} 
          value={formatCurrency(totals.totalMargin)} 
          label={`Marge ON (${marginPercentage}%)`}
          variant="success"
        />
        <KpiCard 
          icon={ArrowDownRight} 
          value={formatCurrency(totals.totalSupplierDue)} 
          label="À reverser" 
          variant="warning"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <select 
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="all">Toutes les périodes</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
        </div>
        <Button variant="secondary" className="gap-2">
          <Download className="w-4 h-4" />
          Exporter
        </Button>
      </div>

      {/* Rapports par fournisseur */}
      <div className="space-y-4">
        {supplierSales.filter(s => (s.gross_sales ?? 0) > 0).map((report) => {
          const supplier = suppliers.find(s => s.id === report.supplier_id);
          
          return (
            <div key={report.supplier_id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              {/* Header fournisseur */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-secondary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                    {(report.supplier_name || '??').split(' ').slice(0, 2).map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold">{report.supplier_name}</div>
                    {report.supplier_type && (
                      <StatusBadge variant={supplierTypeVariant[report.supplier_type]}>
                        {supplierTypeLabel[report.supplier_type]}
                      </StatusBadge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <div className="text-xs text-muted-foreground">CA</div>
                    <div className="font-semibold">{formatCurrency(report.gross_sales)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Articles</div>
                    <div className="font-semibold">{report.items_sold ?? 0}</div>
                  </div>
                  {report.supplier_type === "consignment" && (
                    <div>
                      <div className="text-xs text-muted-foreground">À reverser</div>
                      <div className="font-semibold text-info">{formatCurrency(report.supplier_due)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground">Marge ON</div>
                    <div className="font-semibold text-success">{formatCurrency(report.our_margin)}</div>
                  </div>
                </div>
              </div>

              {/* Footer avec action */}
              {report.supplier_type === "consignment" && (report.supplier_due ?? 0) > 0 && (
                <div className="flex items-center justify-between p-4 border-t border-border bg-info/5">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Commission ON : </span>
                    <span className="font-medium">{((report.commission_rate ?? 0) * 100).toFixed(0)}%</span>
                    <span className="text-muted-foreground"> • Montant à reverser : </span>
                    <span className="font-semibold text-info">{formatCurrency(report.supplier_due)}</span>
                  </div>
                  <Button size="sm" variant="secondary">Générer relevé</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
