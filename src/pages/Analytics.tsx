import { useMemo, useState } from "react";
import { TrendingUp, ShoppingCart, Users, Euro, Package, DollarSign, Percent } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { useProducts } from "@/hooks/useProducts";
import { useOrders } from "@/hooks/useOrders";
import { useCustomers } from "@/hooks/useCustomers";
import { useSuppliers } from "@/hooks/useSuppliers";
import { TopCustomersWidget } from "@/components/analytics/TopCustomersWidget";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#714B67", "#9B7A91", "#B89AAD", "#D4BAC9", "#E8D5E0"];

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(value);
}

export function AnalyticsPage() {
  const { data: products = [] } = useProducts();
  const { data: orders = [] } = useOrders();
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();
  
  // Top customers period state
  const [topCustomersPeriod, setTopCustomersPeriod] = useState("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Calculate profitability stats
  const profitabilityStats = useMemo(() => {
    let totalCost = 0;
    let totalRevenue = 0;
    let totalMarketplaceFees = 0;
    let totalImportFees = 0;
    let totalShippingCosts = 0;
    let productsWithCost = 0;

    products.forEach((product) => {
      const p = product as any;
      const purchasePrice = product.purchase_price || 0;
      const exchangeRate = p.exchange_rate || 1;
      const currency = p.currency || "EUR";
      const marketplaceFees = p.marketplace_fees || 0;
      const importFees = p.import_fees || 0;
      const shippingCost = p.shipping_cost || 0;
      const stock = product.stock || 0;

      // Convert to EUR if needed
      const purchaseInEur = currency === "USD" ? purchasePrice * exchangeRate : purchasePrice;
      
      const unitCost = purchaseInEur + marketplaceFees + importFees + shippingCost;
      
      if (purchasePrice > 0) {
        productsWithCost++;
        totalCost += unitCost * stock;
        totalRevenue += product.selling_price * stock;
        totalMarketplaceFees += marketplaceFees * stock;
        totalImportFees += importFees * stock;
        totalShippingCosts += shippingCost * stock;
      }
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      totalCost,
      totalRevenue,
      totalProfit,
      profitMargin,
      totalMarketplaceFees,
      totalImportFees,
      totalShippingCosts,
      productsWithCost,
    };
  }, [products]);

  // Calculs des données de ventes
  const stats = useMemo(() => {
    const completedOrders = orders.filter((o) => o.status !== "cancelled" && o.status !== "refunded");
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = completedOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalCustomers: customers.length,
      totalProducts: products.length,
    };
  }, [orders, customers, products]);

  // Ventes par mois (à partir des vraies commandes)
  const salesByMonth = useMemo(() => {
    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const monthData: { [key: string]: { revenue: number; orders: number } } = {};

    orders.forEach((order) => {
      if (order.status === "cancelled" || order.status === "refunded") return;
      const date = new Date(order.created_at || "");
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!monthData[monthKey]) {
        monthData[monthKey] = { revenue: 0, orders: 0 };
      }
      monthData[monthKey].revenue += order.total;
      monthData[monthKey].orders += 1;
    });

    // Get last 12 months
    const result = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      result.push({
        month: monthNames[date.getMonth()],
        revenue: monthData[key]?.revenue || 0,
        orders: monthData[key]?.orders || 0,
      });
    }
    return result;
  }, [orders]);

  // Coûts par catégorie
  const costBreakdown = useMemo(() => {
    let purchaseCosts = 0;
    let marketplaceFees = 0;
    let importFees = 0;
    let shippingCosts = 0;

    products.forEach((product) => {
      const p = product as any;
      const stock = product.stock || 0;
      const purchasePrice = product.purchase_price || 0;
      const exchangeRate = p.exchange_rate || 1;
      const currency = p.currency || "EUR";

      const purchaseInEur = currency === "USD" ? purchasePrice * exchangeRate : purchasePrice;
      
      purchaseCosts += purchaseInEur * stock;
      marketplaceFees += (p.marketplace_fees || 0) * stock;
      importFees += (p.import_fees || 0) * stock;
      shippingCosts += (p.shipping_cost || 0) * stock;
    });

    return [
      { name: "Achats", value: purchaseCosts },
      { name: "Marketplace", value: marketplaceFees },
      { name: "Import", value: importFees },
      { name: "Port", value: shippingCosts },
    ].filter(item => item.value > 0);
  }, [products]);

  // Répartition par format
  const salesByFormat = useMemo(() => {
    const formatSales = new Map<string, number>();
    const formatLabels: Record<string, string> = {
      lp: "LP",
      "2lp": "2×LP",
      "3lp": "3×LP",
      cd: "CD",
      boxset: "Box Set",
      "7inch": '7"',
      "10inch": '10"',
      "12inch": '12"',
      cassette: "K7",
      digital: "Digital",
    };

    products.forEach((product) => {
      const format = formatLabels[product.format] || product.format.toUpperCase();
      const existing = formatSales.get(format) || 0;
      formatSales.set(format, existing + (product.stock || 0));
    });

    return Array.from(formatSales.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0);
  }, [products]);

  // Top produits par marge
  const topProfitProducts = useMemo(() => {
    return products
      .map((product) => {
        const p = product as any;
        const purchasePrice = product.purchase_price || 0;
        const exchangeRate = p.exchange_rate || 1;
        const currency = p.currency || "EUR";
        const marketplaceFees = p.marketplace_fees || 0;
        const importFees = p.import_fees || 0;
        const shippingCost = p.shipping_cost || 0;

        const purchaseInEur = currency === "USD" ? purchasePrice * exchangeRate : purchasePrice;
        const totalCost = purchaseInEur + marketplaceFees + importFees + shippingCost;
        const profit = product.selling_price - totalCost;
        const profitMargin = product.selling_price > 0 ? (profit / product.selling_price) * 100 : 0;

        return {
          id: product.id,
          title: product.title,
          artist: product.artist_name,
          sellingPrice: product.selling_price,
          totalCost,
          profit,
          profitMargin,
          stock: product.stock || 0,
        };
      })
      .filter((p) => p.totalCost > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }, [products]);

  // Produits par devise
  const productsByCurrency = useMemo(() => {
    let eurCount = 0;
    let usdCount = 0;

    products.forEach((product) => {
      const p = product as any;
      if (p.currency === "USD") usdCount++;
      else eurCount++;
    });

    return [
      { name: "EUR", value: eurCount },
      { name: "USD", value: usdCount },
    ].filter(item => item.value > 0);
  }, [products]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <KpiCard icon={Euro} value={formatCurrency(stats.totalRevenue)} label="CA Total" variant="primary" />
        <KpiCard icon={ShoppingCart} value={stats.totalOrders.toString()} label="Commandes" variant="info" />
        <KpiCard icon={TrendingUp} value={formatCurrency(stats.avgOrderValue)} label="Panier moyen" variant="success" />
        <KpiCard icon={Users} value={stats.totalCustomers.toString()} label="Clients" variant="warning" />
        <KpiCard icon={Package} value={stats.totalProducts.toString()} label="Produits" variant="primary" />
        <KpiCard 
          icon={DollarSign} 
          value={formatCurrency(profitabilityStats.totalProfit)} 
          label="Marge brute" 
          variant={profitabilityStats.totalProfit >= 0 ? "success" : "warning"} 
        />
        <KpiCard 
          icon={Percent} 
          value={`${profitabilityStats.profitMargin.toFixed(1)}%`} 
          label="Taux de marge" 
          variant={profitabilityStats.profitMargin >= 20 ? "success" : "warning"} 
        />
      </div>

      {/* Profitability Summary */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Résumé de rentabilité (stock actuel)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="p-4 bg-secondary/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Valeur stock (vente)</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(profitabilityStats.totalRevenue)}</div>
          </div>
          <div className="p-4 bg-secondary/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Coût total stock</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(profitabilityStats.totalCost)}</div>
          </div>
          <div className="p-4 bg-secondary/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Frais Marketplace</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(profitabilityStats.totalMarketplaceFees)}</div>
          </div>
          <div className="p-4 bg-secondary/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Frais Import</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(profitabilityStats.totalImportFees)}</div>
          </div>
          <div className="p-4 bg-secondary/30 rounded-lg">
            <div className="text-sm text-muted-foreground">Frais de Port</div>
            <div className="text-xl font-bold mt-1">{formatCurrency(profitabilityStats.totalShippingCosts)}</div>
          </div>
          <div className={`p-4 rounded-lg ${profitabilityStats.totalProfit >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
            <div className="text-sm text-muted-foreground">Marge potentielle</div>
            <div className={`text-xl font-bold mt-1 ${profitabilityStats.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(profitabilityStats.totalProfit)}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Basé sur {profitabilityStats.productsWithCost} produits avec un prix d'achat renseigné
        </p>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des ventes */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Évolution des ventes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des coûts */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Répartition des coûts</h3>
          {costBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {costBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
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
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Aucune donnée de coût disponible
            </div>
          )}
        </div>
      </div>

      {/* Top produits par marge */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Top 10 produits par marge</h3>
        {topProfitProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Produit</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Prix vente</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Coût total</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Marge €</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Marge %</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">Stock</th>
                </tr>
              </thead>
              <tbody>
                {topProfitProducts.map((product, index) => (
                  <tr key={product.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-2">{index + 1}</td>
                    <td className="py-3 px-2">
                      <div className="font-medium">{product.title}</div>
                      <div className="text-xs text-muted-foreground">{product.artist}</div>
                    </td>
                    <td className="py-3 px-2 text-right">{formatCurrency(product.sellingPrice)}</td>
                    <td className="py-3 px-2 text-right">{formatCurrency(product.totalCost)}</td>
                    <td className={`py-3 px-2 text-right font-medium ${product.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(product.profit)}
                    </td>
                    <td className={`py-3 px-2 text-right ${product.profitMargin >= 20 ? "text-green-600" : product.profitMargin >= 0 ? "text-amber-600" : "text-red-600"}`}>
                      {product.profitMargin.toFixed(1)}%
                    </td>
                    <td className="py-3 px-2 text-right">{product.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Aucun produit avec un coût renseigné
          </div>
        )}
      </div>

      {/* Top Customers Widget */}
      <TopCustomersWidget
        orders={orders as any}
        customers={customers}
        selectedPeriod={topCustomersPeriod}
        onPeriodChange={setTopCustomersPeriod}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
        onCustomDateChange={(start, end) => {
          setCustomStartDate(start);
          setCustomEndDate(end);
        }}
      />

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commandes par mois */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Commandes par mois</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition par format */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Stock par format</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={salesByFormat}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {salesByFormat.map((entry, index) => (
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
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Devises */}
      {productsByCurrency.length > 1 && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Produits par devise d'achat</h3>
          <div className="flex gap-4">
            {productsByCurrency.map((item, index) => (
              <div key={item.name} className="flex items-center gap-3 px-4 py-2 bg-secondary/30 rounded-lg">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground">{item.value} produits</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
