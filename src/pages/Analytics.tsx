import { useMemo } from "react";
import { TrendingUp, ShoppingCart, Users, Euro, Package } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { orders, products, customers, suppliers, formatCurrency } from "@/data/demo-data";
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

export function AnalyticsPage() {
  // Calculs des données
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.total, 0);

    const totalOrders = orders.filter((o) => o.status !== "cancelled").length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      totalCustomers: customers.length,
      totalProducts: products.length,
    };
  }, []);

  // Ventes par mois (simulé)
  const salesByMonth = useMemo(() => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    return months.map((month, index) => ({
      month,
      revenue: Math.round(2000 + Math.random() * 3000),
      orders: Math.round(15 + Math.random() * 25),
    }));
  }, []);

  // Top produits
  const topProducts = useMemo(() => {
    const productSales = new Map<string, { title: string; artist: string; quantity: number; revenue: number }>();

    orders.forEach((order) => {
      if (order.status === "cancelled") return;
      order.items.forEach((item) => {
        const existing = productSales.get(item.productId) || {
          title: item.productTitle,
          artist: item.artist,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.unitPrice * item.quantity;
        productSales.set(item.productId, existing);
      });
    });

    return Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, []);

  // Ventes par fournisseur
  const salesBySupplier = useMemo(() => {
    const supplierSales = new Map<string, { name: string; revenue: number }>();

    orders.forEach((order) => {
      if (order.status === "cancelled") return;
      order.items.forEach((item) => {
        const supplier = suppliers.find((s) => s.id === item.supplierId);
        if (!supplier) return;
        const existing = supplierSales.get(item.supplierId) || { name: supplier.name, revenue: 0 };
        existing.revenue += item.unitPrice * item.quantity;
        supplierSales.set(item.supplierId, existing);
      });
    });

    return Array.from(supplierSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, []);

  // Répartition par format
  const salesByFormat = useMemo(() => {
    const formatSales = new Map<string, number>();
    const formatLabels: Record<string, string> = {
      lp: "LP",
      "2lp": "2×LP",
      cd: "CD",
      boxset: "Box Set",
      "7inch": '7"',
      cassette: "K7",
    };

    orders.forEach((order) => {
      if (order.status === "cancelled") return;
      order.items.forEach((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return;
        const format = formatLabels[product.format] || product.format.toUpperCase();
        const existing = formatSales.get(format) || 0;
        formatSales.set(format, existing + item.quantity);
      });
    });

    return Array.from(formatSales.entries()).map(([name, value]) => ({ name, value }));
  }, []);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <KpiCard icon={Euro} value={formatCurrency(stats.totalRevenue)} label="CA Total" variant="primary" />
        <KpiCard icon={ShoppingCart} value={stats.totalOrders.toString()} label="Commandes" variant="info" />
        <KpiCard icon={TrendingUp} value={formatCurrency(stats.avgOrderValue)} label="Panier moyen" variant="success" />
        <KpiCard icon={Users} value={stats.totalCustomers.toString()} label="Clients" variant="warning" />
        <KpiCard icon={Package} value={stats.totalProducts.toString()} label="Produits" variant="primary" />
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

        {/* Commandes par mois */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
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
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top produits */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Top 5 produits</h3>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-sm font-bold text-primary">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{product.title}</div>
                  <div className="text-xs text-muted-foreground">{product.artist}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(product.revenue)}</div>
                  <div className="text-xs text-muted-foreground">{product.quantity} vendus</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition par format */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Par format</h3>
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

      {/* Ventes par fournisseur */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">CA par fournisseur</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesBySupplier} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={150} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
