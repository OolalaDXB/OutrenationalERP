import { useMemo, useState } from "react";
import { Euro, TrendingUp, Package, ArrowUpRight, ArrowDownRight, Download, Calendar } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { suppliers, orders, products, formatCurrency, Supplier } from "@/data/demo-data";

interface SupplierSalesReport {
  supplier: Supplier;
  totalSales: number;
  itemsSold: number;
  consignmentDue: number;
  ourMargin: number;
  productsSold: Array<{
    productId: string;
    title: string;
    artist: string;
    quantity: number;
    revenue: number;
    consignmentAmount: number;
  }>;
}

export function SupplierSalesPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  // Calculer les rapports de ventes par fournisseur
  const reports = useMemo(() => {
    const reportMap = new Map<string, SupplierSalesReport>();

    // Initialiser les rapports pour chaque fournisseur
    suppliers.forEach((supplier) => {
      reportMap.set(supplier.id, {
        supplier,
        totalSales: 0,
        itemsSold: 0,
        consignmentDue: 0,
        ourMargin: 0,
        productsSold: [],
      });
    });

    // Parcourir les commandes pour calculer les ventes
    orders.forEach((order) => {
      if (order.status === "cancelled") return;

      order.items.forEach((item) => {
        const report = reportMap.get(item.supplierId);
        if (!report) return;

        const revenue = item.unitPrice * item.quantity;
        const consignmentAmount = item.supplierType === "consignment" 
          ? revenue * (1 - item.commissionRate) 
          : 0;
        const margin = item.supplierType === "consignment" 
          ? revenue * item.commissionRate 
          : revenue - (products.find(p => p.id === item.productId)?.purchasePrice || 0) * item.quantity;

        report.totalSales += revenue;
        report.itemsSold += item.quantity;
        report.consignmentDue += consignmentAmount;
        report.ourMargin += margin;

        // Ajouter ou mettre à jour le produit vendu
        const existingProduct = report.productsSold.find(p => p.productId === item.productId);
        if (existingProduct) {
          existingProduct.quantity += item.quantity;
          existingProduct.revenue += revenue;
          existingProduct.consignmentAmount += consignmentAmount;
        } else {
          report.productsSold.push({
            productId: item.productId,
            title: item.productTitle,
            artist: item.artist,
            quantity: item.quantity,
            revenue,
            consignmentAmount,
          });
        }
      });
    });

    return Array.from(reportMap.values())
      .filter(r => r.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales);
  }, []);

  // Totaux globaux
  const totals = useMemo(() => {
    return reports.reduce(
      (acc, r) => ({
        totalSales: acc.totalSales + r.totalSales,
        totalItems: acc.totalItems + r.itemsSold,
        totalConsignmentDue: acc.totalConsignmentDue + r.consignmentDue,
        totalMargin: acc.totalMargin + r.ourMargin,
      }),
      { totalSales: 0, totalItems: 0, totalConsignmentDue: 0, totalMargin: 0 }
    );
  }, [reports]);

  const marginPercentage = totals.totalSales > 0 
    ? ((totals.totalMargin / totals.totalSales) * 100).toFixed(1) 
    : "0";

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
          value={formatCurrency(totals.totalConsignmentDue)} 
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
        {reports.map((report) => (
          <div key={report.supplier.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Header fournisseur */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                  {report.supplier.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-semibold">{report.supplier.name}</div>
                  <StatusBadge variant={supplierTypeVariant[report.supplier.type]}>
                    {supplierTypeLabel[report.supplier.type]}
                  </StatusBadge>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="text-xs text-muted-foreground">CA</div>
                  <div className="font-semibold">{formatCurrency(report.totalSales)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Articles</div>
                  <div className="font-semibold">{report.itemsSold}</div>
                </div>
                {report.supplier.type === "consignment" && (
                  <div>
                    <div className="text-xs text-muted-foreground">À reverser</div>
                    <div className="font-semibold text-info">{formatCurrency(report.consignmentDue)}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground">Marge ON</div>
                  <div className="font-semibold text-success">{formatCurrency(report.ourMargin)}</div>
                </div>
              </div>
            </div>

            {/* Détail des produits vendus */}
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Produit</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Artiste</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Qté</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">CA</th>
                  {report.supplier.type === "consignment" && (
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Dû fournisseur</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {report.productsSold.map((product) => (
                  <tr key={product.productId} className="border-t border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-2 text-sm">{product.title}</td>
                    <td className="px-4 py-2 text-sm text-muted-foreground">{product.artist}</td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums">{product.quantity}</td>
                    <td className="px-4 py-2 text-sm text-right tabular-nums font-medium">{formatCurrency(product.revenue)}</td>
                    {report.supplier.type === "consignment" && (
                      <td className="px-4 py-2 text-sm text-right tabular-nums text-info">{formatCurrency(product.consignmentAmount)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer avec action */}
            {report.supplier.type === "consignment" && report.consignmentDue > 0 && (
              <div className="flex items-center justify-between p-4 border-t border-border bg-info/5">
                <div className="text-sm">
                  <span className="text-muted-foreground">Commission ON : </span>
                  <span className="font-medium">{(report.supplier.commissionRate * 100).toFixed(0)}%</span>
                  <span className="text-muted-foreground"> • Montant à reverser : </span>
                  <span className="font-semibold text-info">{formatCurrency(report.consignmentDue)}</span>
                </div>
                <Button size="sm" variant="secondary">Générer relevé</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
