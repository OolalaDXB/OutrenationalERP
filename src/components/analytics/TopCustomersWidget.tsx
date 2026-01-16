import { useMemo, useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, subMonths, subYears, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Users, TrendingUp, Euro, ShoppingCart, Crown, Medal, Award, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { Customer } from "@/hooks/useCustomers";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Order {
  id: string;
  customer_id: string | null;
  customer_name?: string | null;
  customer_email: string;
  total: number;
  status?: string | null;
  created_at?: string | null;
}

interface TopCustomersWidgetProps {
  orders: Order[];
  customers: Customer[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  customStartDate?: string;
  customEndDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
  onCustomerClick?: (customerId: string) => void;
}

export const periodPresets = [
  { value: "30days", label: "30 derniers jours" },
  { value: "thisMonth", label: "Ce mois" },
  { value: "lastMonth", label: "Mois dernier" },
  { value: "ytd", label: "Année en cours (YTD)" },
  { value: "lastYear", label: "Année passée" },
  { value: "all", label: "Toutes les périodes" },
  { value: "custom", label: "Personnalisé" },
];

export function getDateRangeForPeriod(period: string, customStart?: string, customEnd?: string): { start: Date; end: Date } | null {
  const now = new Date();
  
  switch (period) {
    case "30days":
      return { start: subDays(now, 30), end: now };
    case "thisMonth":
      return { start: startOfMonth(now), end: now };
    case "lastMonth":
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case "ytd":
      return { start: startOfYear(now), end: now };
    case "lastYear":
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: new Date(lastYear.getFullYear(), 11, 31, 23, 59, 59) };
    case "custom":
      if (customStart && customEnd) {
        return { start: new Date(customStart), end: new Date(customEnd) };
      }
      return null;
    case "all":
    default:
      return null;
  }
}

// Get the previous period range (same duration, just before the current period)
export function getPreviousPeriodRange(dateRange: { start: Date; end: Date } | null): { start: Date; end: Date } | null {
  if (!dateRange) return null;
  
  const duration = differenceInDays(dateRange.end, dateRange.start);
  const previousEnd = subDays(dateRange.start, 1);
  const previousStart = subDays(previousEnd, duration);
  
  return { start: previousStart, end: previousEnd };
}

export function TopCustomersWidget({ 
  orders, 
  customers, 
  selectedPeriod, 
  onPeriodChange,
  customStartDate,
  customEndDate,
  onCustomDateChange,
  onCustomerClick
}: TopCustomersWidgetProps) {
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

  // Calculate top customers
  const topCustomers = useMemo(() => {
    const customerStats: Record<string, {
      customer_id: string;
      name: string;
      email: string;
      total_spent: number;
      orders_count: number;
      avg_order: number;
    }> = {};

    filteredOrders.forEach(order => {
      const customerId = order.customer_id || order.customer_email;
      if (!customerId) return;

      const customer = customers.find(c => c.id === order.customer_id);
      const name = customer 
        ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.company_name || customer.email
        : order.customer_name || order.customer_email;

      if (!customerStats[customerId]) {
        customerStats[customerId] = {
          customer_id: customerId,
          name,
          email: customer?.email || order.customer_email,
          total_spent: 0,
          orders_count: 0,
          avg_order: 0,
        };
      }

      customerStats[customerId].total_spent += order.total;
      customerStats[customerId].orders_count += 1;
    });

    // Calculate averages
    Object.values(customerStats).forEach(stat => {
      stat.avg_order = stat.orders_count > 0 ? stat.total_spent / stat.orders_count : 0;
    });

    return Object.values(customerStats)
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 10);
  }, [filteredOrders, customers]);

  // Global stats for current period
  const stats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const uniqueCustomers = new Set(filteredOrders.map(o => o.customer_id || o.customer_email)).size;
    const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
    const topCustomerRevenue = topCustomers[0]?.total_spent || 0;
    const topCustomerShare = totalRevenue > 0 ? (topCustomerRevenue / totalRevenue) * 100 : 0;
    const ordersCount = filteredOrders.length;

    return { totalRevenue, uniqueCustomers, avgOrderValue, topCustomerShare, ordersCount };
  }, [filteredOrders, topCustomers]);

  // Get previous period range
  const previousPeriodRange = useMemo(() => getPreviousPeriodRange(dateRange), [dateRange]);

  // Filter orders for previous period
  const previousPeriodOrders = useMemo(() => {
    if (!previousPeriodRange) return [];
    return orders.filter(order => {
      if (order.status === "cancelled" || order.status === "refunded") return false;
      if (!order.created_at) return false;
      const orderDate = new Date(order.created_at);
      return orderDate >= previousPeriodRange.start && orderDate <= previousPeriodRange.end;
    });
  }, [orders, previousPeriodRange]);

  // Previous period stats
  const previousStats = useMemo(() => {
    const totalRevenue = previousPeriodOrders.reduce((sum, o) => sum + o.total, 0);
    const uniqueCustomers = new Set(previousPeriodOrders.map(o => o.customer_id || o.customer_email)).size;
    const avgOrderValue = previousPeriodOrders.length > 0 ? totalRevenue / previousPeriodOrders.length : 0;
    const ordersCount = previousPeriodOrders.length;

    return { totalRevenue, uniqueCustomers, avgOrderValue, ordersCount };
  }, [previousPeriodOrders]);

  // Calculate percentage changes
  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Comparison data for chart
  const comparisonData = useMemo(() => {
    if (!dateRange || !previousPeriodRange) return null;

    return [
      {
        name: "CA (€)",
        current: stats.totalRevenue,
        previous: previousStats.totalRevenue,
        change: getPercentageChange(stats.totalRevenue, previousStats.totalRevenue),
      },
      {
        name: "Clients",
        current: stats.uniqueCustomers,
        previous: previousStats.uniqueCustomers,
        change: getPercentageChange(stats.uniqueCustomers, previousStats.uniqueCustomers),
      },
      {
        name: "Commandes",
        current: stats.ordersCount,
        previous: previousStats.ordersCount,
        change: getPercentageChange(stats.ordersCount, previousStats.ordersCount),
      },
      {
        name: "Panier (€)",
        current: stats.avgOrderValue,
        previous: previousStats.avgOrderValue,
        change: getPercentageChange(stats.avgOrderValue, previousStats.avgOrderValue),
      },
    ];
  }, [stats, previousStats, dateRange, previousPeriodRange]);

  const periodLabel = dateRange 
    ? `${format(dateRange.start, "d MMM yyyy", { locale: fr })} - ${format(dateRange.end, "d MMM yyyy", { locale: fr })}`
    : "Toutes les périodes";

  const previousPeriodLabel = previousPeriodRange
    ? `${format(previousPeriodRange.start, "d MMM yyyy", { locale: fr })} - ${format(previousPeriodRange.end, "d MMM yyyy", { locale: fr })}`
    : null;

  const rankIcons = [Crown, Medal, Award];
  const rankColors = ["text-amber-500", "text-slate-400", "text-amber-700"];

  const ChangeIndicator = ({ change }: { change: number }) => {
    if (change > 0) {
      return (
        <span className="inline-flex items-center text-xs text-green-600 font-medium">
          <ArrowUpRight className="w-3 h-3" />
          +{change.toFixed(1)}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="inline-flex items-center text-xs text-red-600 font-medium">
          <ArrowDownRight className="w-3 h-3" />
          {change.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-xs text-muted-foreground font-medium">
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Meilleurs clients</h3>
            <p className="text-sm text-muted-foreground">{periodLabel}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="px-3 py-2 rounded-md border border-border bg-background text-sm"
          >
            {periodPresets.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          
          {selectedPeriod === "custom" && onCustomDateChange && (
            <>
              <input
                type="date"
                value={customStartDate || ""}
                onChange={(e) => onCustomDateChange(e.target.value, customEndDate || "")}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm"
              />
              <input
                type="date"
                value={customEndDate || ""}
                onChange={(e) => onCustomDateChange(customStartDate || "", e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm"
              />
            </>
          )}
        </div>
      </div>

      {/* Quick Stats with Comparison */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{stats.uniqueCustomers}</div>
          <div className="text-xs text-muted-foreground">Clients actifs</div>
          {previousPeriodRange && (
            <ChangeIndicator change={getPercentageChange(stats.uniqueCustomers, previousStats.uniqueCustomers)} />
          )}
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          <div className="text-xs text-muted-foreground">CA total</div>
          {previousPeriodRange && (
            <ChangeIndicator change={getPercentageChange(stats.totalRevenue, previousStats.totalRevenue)} />
          )}
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{formatCurrency(stats.avgOrderValue)}</div>
          <div className="text-xs text-muted-foreground">Panier moyen</div>
          {previousPeriodRange && (
            <ChangeIndicator change={getPercentageChange(stats.avgOrderValue, previousStats.avgOrderValue)} />
          )}
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold">{stats.topCustomerShare.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">Part top client</div>
        </div>
      </div>

      {/* Period Comparison Chart */}
      {comparisonData && (
        <div className="mb-6 bg-secondary/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Comparaison période vs période précédente
            </h4>
            {previousPeriodLabel && (
              <span className="text-xs text-muted-foreground">
                vs {previousPeriodLabel}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                  return value.toFixed(0);
                }}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={11}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => {
                  const formattedValue = name === "current" || name === "previous"
                    ? value.toFixed(2)
                    : value;
                  const label = name === "current" ? "Période actuelle" : "Période précédente";
                  return [formattedValue, label];
                }}
              />
              <Legend 
                formatter={(value) => value === "current" ? "Période actuelle" : "Période précédente"}
              />
              <Bar 
                dataKey="previous" 
                fill="hsl(var(--muted-foreground))" 
                radius={[0, 4, 4, 0]}
                name="previous"
              />
              <Bar 
                dataKey="current" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
                name="current"
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Comparison Summary */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {comparisonData.map((item) => (
              <div key={item.name} className="text-center p-2 bg-background rounded">
                <div className="text-xs font-medium text-muted-foreground mb-1">{item.name}</div>
                <ChangeIndicator change={item.change} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message when no comparison available */}
      {!comparisonData && selectedPeriod !== "all" && (
        <div className="mb-6 bg-secondary/20 rounded-lg p-4 text-center text-sm text-muted-foreground">
          <TrendingUp className="w-5 h-5 mx-auto mb-2 opacity-50" />
          Sélectionnez une période pour voir la comparaison avec la période précédente
        </div>
      )}

      {/* Top Customers Table */}
      {topCustomers.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Aucune commande sur cette période
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground w-12">#</th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">Client</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Commandes</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total dépensé</th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">Panier moyen</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((customer, index) => {
                const RankIcon = rankIcons[index] || null;
                const rankColor = rankColors[index] || "text-muted-foreground";
                
                return (
                  <tr key={customer.customer_id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-2">
                      {RankIcon ? (
                        <RankIcon className={`w-5 h-5 ${rankColor}`} />
                      ) : (
                        <span className="text-muted-foreground">{index + 1}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      <button 
                        onClick={() => onCustomerClick?.(customer.customer_id)}
                        className="text-left hover:underline"
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">{customer.email}</div>
                      </button>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        <ShoppingCart className="w-3 h-3 text-muted-foreground" />
                        {customer.orders_count}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-primary">
                      {formatCurrency(customer.total_spent)}
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground">
                      {formatCurrency(customer.avg_order)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
