import { useMemo, useState } from "react";
import { Euro, Package, ArrowUpRight, ArrowDownRight, Download, Loader2, TrendingUp, Percent, DollarSign, FileSpreadsheet, FileText, Calendar } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { useSupplierSalesView } from "@/hooks/useDashboard";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { useAllOrderItems } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/format";
import { SupplierSalesReport } from "@/components/reports/SupplierSalesReport";
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
} from "recharts";

const COLORS = ["#714B67", "#9B7A91", "#B89AAD", "#D4BAC9", "#E8D5E0", "#F0E8EB"];

export function SupplierSalesPage() {
  const { data: supplierSales = [], isLoading: salesLoading, isError: salesError, error: salesErr, refetch: refetchSales } = useSupplierSalesView();
  const { data: suppliers = [], isLoading: suppliersLoading, isError: suppliersError, error: suppliersErr, refetch: refetchSuppliers } = useSuppliers();
  const { data: products = [] } = useProducts();
  const { data: orderItems = [] } = useAllOrderItems();
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [viewMode, setViewMode] = useState<"sales" | "profitability">("profitability");
  const [isReportOpen, setIsReportOpen] = useState(false);

  const isLoading = salesLoading || suppliersLoading;
  const isError = salesError || suppliersError;
  const errorMessage = salesErr instanceof Error ? salesErr.message : suppliersErr instanceof Error ? suppliersErr.message : "Erreur inconnue";

  // Calcul de la rentabilité par fournisseur
  const profitabilityBySupplier = useMemo(() => {
    const supplierData: Record<string, {
      supplier_id: string;
      supplier_name: string;
      supplier_type: string;
      product_count: number;
      total_stock: number;
      total_purchase_cost: number;
      total_selling_value: number;
      total_marketplace_fees: number;
      total_import_fees: number;
      total_shipping_costs: number;
      total_cost: number;
      potential_revenue: number;
      potential_profit: number;
      profit_margin: number;
    }> = {};

    products.forEach((product) => {
      const p = product as any;
      const supplierId = product.supplier_id;
      const supplier = suppliers.find(s => s.id === supplierId);
      
      if (!supplier) return;

      if (!supplierData[supplierId]) {
        supplierData[supplierId] = {
          supplier_id: supplierId,
          supplier_name: supplier.name,
          supplier_type: supplier.type,
          product_count: 0,
          total_stock: 0,
          total_purchase_cost: 0,
          total_selling_value: 0,
          total_marketplace_fees: 0,
          total_import_fees: 0,
          total_shipping_costs: 0,
          total_cost: 0,
          potential_revenue: 0,
          potential_profit: 0,
          profit_margin: 0,
        };
      }

      const stock = product.stock || 0;
      const purchasePrice = product.purchase_price || 0;
      const exchangeRate = p.exchange_rate || 1;
      const currency = p.currency || "EUR";
      const marketplaceFees = p.marketplace_fees || 0;
      const importFees = p.import_fees || 0;
      const shippingCost = p.shipping_cost || 0;

      const purchaseInEur = currency === "USD" ? purchasePrice * exchangeRate : purchasePrice;
      const unitCost = purchaseInEur + marketplaceFees + importFees + shippingCost;

      supplierData[supplierId].product_count += 1;
      supplierData[supplierId].total_stock += stock;
      supplierData[supplierId].total_purchase_cost += purchaseInEur * stock;
      supplierData[supplierId].total_selling_value += product.selling_price * stock;
      supplierData[supplierId].total_marketplace_fees += marketplaceFees * stock;
      supplierData[supplierId].total_import_fees += importFees * stock;
      supplierData[supplierId].total_shipping_costs += shippingCost * stock;
      supplierData[supplierId].total_cost += unitCost * stock;
      supplierData[supplierId].potential_revenue += product.selling_price * stock;
    });

    // Calculate profit margins
    Object.values(supplierData).forEach(data => {
      data.potential_profit = data.potential_revenue - data.total_cost;
      data.profit_margin = data.potential_revenue > 0 
        ? (data.potential_profit / data.potential_revenue) * 100 
        : 0;
    });

    return Object.values(supplierData).sort((a, b) => b.potential_profit - a.potential_profit);
  }, [products, suppliers]);

  // Totaux globaux des ventes
  const salesTotals = useMemo(() => {
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

  // Totaux de rentabilité
  const profitTotals = useMemo(() => {
    return profitabilityBySupplier.reduce(
      (acc, r) => ({
        totalStock: acc.totalStock + r.total_stock,
        totalCost: acc.totalCost + r.total_cost,
        totalRevenue: acc.totalRevenue + r.potential_revenue,
        totalProfit: acc.totalProfit + r.potential_profit,
        totalMarketplaceFees: acc.totalMarketplaceFees + r.total_marketplace_fees,
        totalImportFees: acc.totalImportFees + r.total_import_fees,
        totalShippingCosts: acc.totalShippingCosts + r.total_shipping_costs,
      }),
      { totalStock: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0, totalMarketplaceFees: 0, totalImportFees: 0, totalShippingCosts: 0 }
    );
  }, [profitabilityBySupplier]);

  const marginPercentage = salesTotals.totalSales > 0 
    ? ((salesTotals.totalMargin / salesTotals.totalSales) * 100).toFixed(1) 
    : "0";

  const profitMarginPercentage = profitTotals.totalRevenue > 0
    ? ((profitTotals.totalProfit / profitTotals.totalRevenue) * 100).toFixed(1)
    : "0";

  // Données pour le graphique
  const chartData = useMemo(() => {
    return profitabilityBySupplier
      .filter(s => s.total_stock > 0)
      .slice(0, 10)
      .map(s => ({
        name: s.supplier_name.length > 15 ? s.supplier_name.substring(0, 15) + '...' : s.supplier_name,
        fullName: s.supplier_name,
        revenue: s.potential_revenue,
        cost: s.total_cost,
        profit: s.potential_profit,
        margin: s.profit_margin,
      }));
  }, [profitabilityBySupplier]);

  // Répartition des coûts
  const costBreakdown = useMemo(() => {
    const totalPurchase = profitTotals.totalCost - profitTotals.totalMarketplaceFees - profitTotals.totalImportFees - profitTotals.totalShippingCosts;
    return [
      { name: "Achats", value: totalPurchase },
      { name: "Marketplace", value: profitTotals.totalMarketplaceFees },
      { name: "Import", value: profitTotals.totalImportFees },
      { name: "Port", value: profitTotals.totalShippingCosts },
    ].filter(item => item.value > 0);
  }, [profitTotals]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="font-semibold text-danger">Impossible de charger les ventes fournisseurs</p>
        <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
        <button
          onClick={() => { refetchSales(); refetchSuppliers(); }}
          className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle View Mode */}
      <div className="flex items-center gap-2 p-1 bg-secondary rounded-lg w-fit">
        <button
          onClick={() => setViewMode("profitability")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === "profitability" 
              ? "bg-card shadow-sm text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Rentabilité
        </button>
        <button
          onClick={() => setViewMode("sales")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewMode === "sales" 
              ? "bg-card shadow-sm text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Ventes
        </button>
      </div>

      {viewMode === "profitability" ? (
        <>
          {/* KPI Cards - Profitability */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <KpiCard 
              icon={Package} 
              value={profitTotals.totalStock.toString()} 
              label="Stock total" 
              variant="info"
            />
            <KpiCard 
              icon={DollarSign} 
              value={formatCurrency(profitTotals.totalCost)} 
              label="Coût total stock" 
              variant="warning"
            />
            <KpiCard 
              icon={Euro} 
              value={formatCurrency(profitTotals.totalRevenue)} 
              label="Valeur vente" 
              variant="primary"
            />
            <KpiCard 
              icon={TrendingUp} 
              value={formatCurrency(profitTotals.totalProfit)} 
              label="Marge potentielle" 
              variant={profitTotals.totalProfit >= 0 ? "success" : "warning"}
            />
            <KpiCard 
              icon={Percent} 
              value={`${profitMarginPercentage}%`} 
              label="Taux de marge" 
              variant={parseFloat(profitMarginPercentage) >= 20 ? "success" : "warning"}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar chart - Profit by supplier */}
            <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Marge par fournisseur</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "profit" ? "Marge" : name === "revenue" ? "CA potentiel" : "Coût"
                    ]}
                    labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                  />
                  <Bar dataKey="profit" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart - Cost breakdown */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Répartition des coûts</h3>
              {costBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={costBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {costBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée de coût
                </div>
              )}
            </div>
          </div>

          {/* Detailed supplier table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold">Détail par fournisseur</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left py-3 px-4 font-medium">Fournisseur</th>
                    <th className="text-center py-3 px-4 font-medium">Type</th>
                    <th className="text-right py-3 px-4 font-medium">Produits</th>
                    <th className="text-right py-3 px-4 font-medium">Stock</th>
                    <th className="text-right py-3 px-4 font-medium">Coût total</th>
                    <th className="text-right py-3 px-4 font-medium">Frais MKP</th>
                    <th className="text-right py-3 px-4 font-medium">Frais Import</th>
                    <th className="text-right py-3 px-4 font-medium">Frais Port</th>
                    <th className="text-right py-3 px-4 font-medium">Valeur vente</th>
                    <th className="text-right py-3 px-4 font-medium">Marge €</th>
                    <th className="text-right py-3 px-4 font-medium">Marge %</th>
                  </tr>
                </thead>
                <tbody>
                  {profitabilityBySupplier.filter(s => s.total_stock > 0).map((data) => (
                    <tr key={data.supplier_id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-3 px-4 font-medium">{data.supplier_name}</td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge variant={supplierTypeVariant[data.supplier_type as keyof typeof supplierTypeVariant]}>
                          {supplierTypeLabel[data.supplier_type as keyof typeof supplierTypeLabel]}
                        </StatusBadge>
                      </td>
                      <td className="py-3 px-4 text-right">{data.product_count}</td>
                      <td className="py-3 px-4 text-right">{data.total_stock}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(data.total_cost)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(data.total_marketplace_fees)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(data.total_import_fees)}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{formatCurrency(data.total_shipping_costs)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(data.potential_revenue)}</td>
                      <td className={`py-3 px-4 text-right font-medium ${data.potential_profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(data.potential_profit)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${data.profit_margin >= 20 ? "text-green-600" : data.profit_margin >= 0 ? "text-amber-600" : "text-red-600"}`}>
                        {data.profit_margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-secondary/50 font-semibold">
                    <td className="py-3 px-4">Total</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-right">{profitabilityBySupplier.length}</td>
                    <td className="py-3 px-4 text-right">{profitTotals.totalStock}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(profitTotals.totalCost)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(profitTotals.totalMarketplaceFees)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(profitTotals.totalImportFees)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(profitTotals.totalShippingCosts)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(profitTotals.totalRevenue)}</td>
                    <td className={`py-3 px-4 text-right ${profitTotals.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(profitTotals.totalProfit)}
                    </td>
                    <td className={`py-3 px-4 text-right ${parseFloat(profitMarginPercentage) >= 20 ? "text-green-600" : "text-amber-600"}`}>
                      {profitMarginPercentage}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* KPI Cards - Sales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard 
              icon={Euro} 
              value={formatCurrency(salesTotals.totalSales)} 
              label="CA Total" 
              variant="primary"
            />
            <KpiCard 
              icon={Package} 
              value={salesTotals.totalItems.toString()} 
              label="Articles vendus" 
              variant="info"
            />
            <KpiCard 
              icon={ArrowUpRight} 
              value={formatCurrency(salesTotals.totalMargin)} 
              label={`Marge ON (${marginPercentage}%)`}
              variant="success"
            />
            <KpiCard 
              icon={ArrowDownRight} 
              value={formatCurrency(salesTotals.totalSupplierDue)} 
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
            <div className="flex gap-2">
              <Button variant="secondary" className="gap-2" onClick={() => setIsReportOpen(true)}>
                <Calendar className="w-4 h-4" />
                Relevé de ventes
              </Button>
            </div>
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
                      {(report.supplier_type === "consignment" || report.supplier_type === "depot_vente") && (
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
                  {(report.supplier_type === "consignment" || report.supplier_type === "depot_vente") && (report.supplier_due ?? 0) > 0 && (
                    <div className="flex items-center justify-between p-4 border-t border-border bg-info/5">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Commission ON : </span>
                        <span className="font-medium">{((report.commission_rate ?? 0) * 100).toFixed(0)}%</span>
                        <span className="text-muted-foreground"> • Montant à reverser : </span>
                        <span className="font-semibold text-info">{formatCurrency(report.supplier_due)}</span>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => setIsReportOpen(true)}>Générer relevé</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Supplier Sales Report Modal */}
          <SupplierSalesReport
            isOpen={isReportOpen}
            onClose={() => setIsReportOpen(false)}
            suppliers={suppliers.map(s => ({ id: s.id, name: s.name, type: s.type, commission_rate: s.commission_rate || 0 }))}
            orderItems={orderItems as any}
          />
        </>
      )}
    </div>
  );
}
