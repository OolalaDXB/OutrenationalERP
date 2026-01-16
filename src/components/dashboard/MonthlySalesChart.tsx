import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";

interface MonthlyData {
  month: string;
  monthLabel: string;
  revenue: number;
  orders: number;
}

export function MonthlySalesChart() {
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ["dashboard", "monthly-sales"],
    queryFn: async () => {
      const twelveMonthsAgo = startOfMonth(subMonths(new Date(), 11));
      
      const { data, error } = await supabase
        .from("orders")
        .select("created_at, total, status")
        .gte("created_at", twelveMonthsAgo.toISOString())
        .not("status", "in", '("cancelled","refunded")');
      
      if (error) throw error;
      return data;
    },
  });

  const chartData = useMemo(() => {
    if (!ordersData) return [];

    // Generate last 12 months
    const months: MonthlyData[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        month: format(date, "yyyy-MM"),
        monthLabel: format(date, "MMM yy", { locale: fr }),
        revenue: 0,
        orders: 0,
      });
    }

    // Aggregate orders by month
    ordersData.forEach((order) => {
      const orderMonth = format(new Date(order.created_at!), "yyyy-MM");
      const monthData = months.find((m) => m.month === orderMonth);
      if (monthData) {
        monthData.revenue += order.total || 0;
        monthData.orders += 1;
      }
    });

    return months;
  }, [ordersData]);

  const totalRevenue = chartData.reduce((sum, m) => sum + m.revenue, 0);
  const totalOrders = chartData.reduce((sum, m) => sum + m.orders, 0);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Ventes mensuelles</h2>
            <p className="text-sm text-muted-foreground">12 derniers mois</p>
          </div>
        </div>
        <div className="flex gap-6">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">CA total</p>
            <p className="font-semibold text-lg">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Commandes</p>
            <p className="font-semibold text-lg">{totalOrders}</p>
          </div>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number, name: string) => [
                name === "revenue" ? formatCurrency(value) : value,
                name === "revenue" ? "Chiffre d'affaires" : "Commandes",
              ]}
              labelFormatter={(label) => `${label}`}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
