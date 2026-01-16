import { useMemo, useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths, subYears, eachMonthOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, ShoppingCart, Euro, Calendar, Package, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { periodPresets, getDateRangeForPeriod } from "@/components/analytics/TopCustomersWidget";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface OrderWithItems {
  id: string;
  order_number: string;
  total: number;
  status?: string | null;
  created_at?: string | null;
  order_items?: {
    id: string;
    title: string;
    artist_name?: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
}

interface CustomerStatsWidgetProps {
  customerId: string;
  orders: OrderWithItems[];
}

export function CustomerStatsWidget({ customerId, orders }: CustomerStatsWidgetProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("ytd");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const dateRange = getDateRangeForPeriod(selectedPeriod, customStartDate, customEndDate);

  // Filter orders by period
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.status === "cancelled" || order.status === "refunded") return false;
      if (!dateRange) return true;
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at);
      return orderDate >= dateRange.start && orderDate <= dateRange.end;
    });
  }, [orders, dateRange]);

  // Stats for the period
  const stats = useMemo(() => {
    const totalSpent = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const ordersCount = filteredOrders.length;
    const avgOrder = ordersCount > 0 ? totalSpent / ordersCount : 0;
    const itemsCount = filteredOrders.reduce((sum, o) => sum + (o.order_items?.reduce((s, i) => s + i.quantity, 0) || 0), 0);

    return { totalSpent, ordersCount, avgOrder, itemsCount };
  }, [filteredOrders]);

  // Monthly trend for the customer
  const monthlyTrend = useMemo(() => {
    if (!dateRange) {
      // For "all", show last 12 months
      const now = new Date();
      const start = subMonths(now, 11);
      const months = eachMonthOfInterval({ start: startOfMonth(start), end: now });
      
      return months.map(month => {
        const mStart = startOfMonth(month);
        const mEnd = endOfMonth(month);
        const monthOrders = orders.filter(o => {
          if (o.status === "cancelled" || o.status === "refunded") return false;
          if (!o.created_at) return false;
          const d = new Date(o.created_at);
          return d >= mStart && d <= mEnd;
        });
        return {
          month: format(month, "MMM yy", { locale: fr }),
          revenue: monthOrders.reduce((sum, o) => sum + o.total, 0),
          orders: monthOrders.length,
        };
      });
    }

    const months = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
    return months.map(month => {
      const mStart = startOfMonth(month);
      const mEnd = endOfMonth(month);
      const monthOrders = filteredOrders.filter(o => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        return d >= mStart && d <= mEnd;
      });
      return {
        month: format(month, "MMM yy", { locale: fr }),
        revenue: monthOrders.reduce((sum, o) => sum + o.total, 0),
        orders: monthOrders.length,
      };
    });
  }, [orders, filteredOrders, dateRange]);

  // Top purchased products
  const topProducts = useMemo(() => {
    const productStats: Record<string, { title: string; artist: string; quantity: number; revenue: number }> = {};
    
    filteredOrders.forEach(order => {
      order.order_items?.forEach(item => {
        const key = item.title;
        if (!productStats[key]) {
          productStats[key] = { title: item.title, artist: item.artist_name || "", quantity: 0, revenue: 0 };
        }
        productStats[key].quantity += item.quantity;
        productStats[key].revenue += item.total_price;
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  const periodLabel = dateRange 
    ? `${format(dateRange.start, "d MMM yyyy", { locale: fr })} - ${format(dateRange.end, "d MMM yyyy", { locale: fr })}`
    : "Toutes les périodes";

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Statistiques:</span>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-2 py-1 rounded-md border border-border bg-background text-sm"
        >
          {periodPresets.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {selectedPeriod === "custom" && (
          <>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-background text-sm"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2 py-1 rounded-md border border-border bg-background text-sm"
            />
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{periodLabel}</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-secondary rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Euro className="w-3 h-3" />
          </div>
          <div className="text-lg font-bold">{formatCurrency(stats.totalSpent)}</div>
          <div className="text-[10px] text-muted-foreground">Total dépensé</div>
        </div>
        <div className="bg-secondary rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <ShoppingCart className="w-3 h-3" />
          </div>
          <div className="text-lg font-bold">{stats.ordersCount}</div>
          <div className="text-[10px] text-muted-foreground">Commandes</div>
        </div>
        <div className="bg-secondary rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="w-3 h-3" />
          </div>
          <div className="text-lg font-bold">{formatCurrency(stats.avgOrder)}</div>
          <div className="text-[10px] text-muted-foreground">Panier moyen</div>
        </div>
        <div className="bg-secondary rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Package className="w-3 h-3" />
          </div>
          <div className="text-lg font-bold">{stats.itemsCount}</div>
          <div className="text-[10px] text-muted-foreground">Articles</div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyTrend.length > 1 && (
        <div className="bg-secondary/30 rounded-lg p-3">
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Évolution des achats</h4>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={9} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={9} tickFormatter={(v) => `${(v / 100).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                formatter={(value: number) => [formatCurrency(value), "CA"]}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Produits les plus achetés</h4>
          <div className="space-y-1">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between text-xs py-1 px-2 bg-secondary/50 rounded">
                <div className="truncate flex-1">
                  <span className="font-medium">{product.title}</span>
                  {product.artist && <span className="text-muted-foreground ml-1">- {product.artist}</span>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-muted-foreground">×{product.quantity}</span>
                  <span className="font-medium">{formatCurrency(product.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
