import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Tables } from "@/integrations/supabase/types";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

type Order = Tables<"orders"> & { order_items?: Tables<"order_items">[] };
type Supplier = Tables<"suppliers">;

interface SupplierSalesEvolutionChartProps {
  orders: Order[];
  suppliers: Supplier[];
}

const CHART_COLORS = [
  "hsl(340, 30%, 45%)",
  "hsl(200, 60%, 50%)",
  "hsl(150, 50%, 45%)",
  "hsl(40, 70%, 50%)",
  "hsl(280, 45%, 55%)",
  "hsl(20, 60%, 50%)",
  "hsl(180, 50%, 45%)",
  "hsl(320, 40%, 50%)",
];

type PeriodType = "7days" | "30days" | "90days" | "12months" | "custom";

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(value);
}

export function SupplierSalesEvolutionChart({ orders, suppliers }: SupplierSalesEvolutionChartProps) {
  const [period, setPeriod] = useState<PeriodType>("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);

  // Get date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (period) {
      case "7days":
        start = subDays(now, 7);
        break;
      case "30days":
        start = subDays(now, 30);
        break;
      case "90days":
        start = subDays(now, 90);
        break;
      case "12months":
        start = subMonths(now, 12);
        break;
      case "custom":
        start = customStartDate ? parseISO(customStartDate) : subDays(now, 30);
        end = customEndDate ? parseISO(customEndDate) : now;
        break;
      default:
        start = subDays(now, 30);
    }

    return { start, end };
  }, [period, customStartDate, customEndDate]);

  // Get suppliers with sales
  const suppliersWithSales = useMemo(() => {
    const supplierSales = new Map<string, number>();

    orders.forEach((order) => {
      if (order.status === "cancelled" || order.status === "refunded") return;
      if (!order.order_items) return;

      order.order_items.forEach((item) => {
        if (item.supplier_id) {
          const current = supplierSales.get(item.supplier_id) || 0;
          supplierSales.set(item.supplier_id, current + item.total_price);
        }
      });
    });

    return suppliers
      .filter((s) => supplierSales.has(s.id))
      .map((s) => ({
        ...s,
        totalSales: supplierSales.get(s.id) || 0,
      }))
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 8);
  }, [orders, suppliers]);

  // Initialize selected suppliers with top 3
  useMemo(() => {
    if (selectedSuppliers.length === 0 && suppliersWithSales.length > 0) {
      setSelectedSuppliers(suppliersWithSales.slice(0, 3).map((s) => s.id));
    }
  }, [suppliersWithSales, selectedSuppliers.length]);

  // Calculate sales evolution data
  const chartData = useMemo(() => {
    const { start, end } = dateRange;
    const isMonthlyView = period === "12months";
    const dataPoints: { [key: string]: { date: string; [supplierId: string]: number | string } } = {};

    // Initialize data points
    if (isMonthlyView) {
      let current = startOfMonth(start);
      while (current <= end) {
        const key = format(current, "yyyy-MM");
        dataPoints[key] = { date: format(current, "MMM yy", { locale: fr }) };
        current = startOfMonth(subDays(current, -32));
      }
    } else {
      let current = new Date(start);
      while (current <= end) {
        const key = format(current, "yyyy-MM-dd");
        dataPoints[key] = { date: format(current, "dd/MM", { locale: fr }) };
        current = subDays(current, -1);
      }
    }

    // Add supplier sales to data points
    orders.forEach((order) => {
      if (order.status === "cancelled" || order.status === "refunded") return;
      if (!order.order_items || !order.created_at) return;

      const orderDate = parseISO(order.created_at);
      if (!isWithinInterval(orderDate, { start, end })) return;

      const key = isMonthlyView
        ? format(orderDate, "yyyy-MM")
        : format(orderDate, "yyyy-MM-dd");

      if (!dataPoints[key]) return;

      order.order_items.forEach((item) => {
        if (item.supplier_id && selectedSuppliers.includes(item.supplier_id)) {
          const currentValue = (dataPoints[key][item.supplier_id] as number) || 0;
          dataPoints[key][item.supplier_id] = currentValue + item.total_price;
        }
      });
    });

    return Object.values(dataPoints).sort((a, b) => 
      a.date.localeCompare(b.date)
    );
  }, [orders, dateRange, period, selectedSuppliers]);

  const toggleSupplier = (supplierId: string) => {
    setSelectedSuppliers((prev) =>
      prev.includes(supplierId)
        ? prev.filter((id) => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-lg font-semibold">Évolution des ventes par fournisseur</h3>
        
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="px-3 py-1.5 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
          >
            <option value="7days">7 derniers jours</option>
            <option value="30days">30 derniers jours</option>
            <option value="90days">90 derniers jours</option>
            <option value="12months">12 derniers mois</option>
            <option value="custom">Période personnalisée</option>
          </select>

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="px-2 py-1.5 rounded-md border border-border bg-card text-sm"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <span className="text-muted-foreground">→</span>
              <input
                type="date"
                className="px-2 py-1.5 rounded-md border border-border bg-card text-sm"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Supplier selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {suppliersWithSales.map((supplier, index) => (
          <button
            key={supplier.id}
            onClick={() => toggleSupplier(supplier.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedSuppliers.includes(supplier.id)
                ? "text-white"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
            style={{
              backgroundColor: selectedSuppliers.includes(supplier.id)
                ? CHART_COLORS[index % CHART_COLORS.length]
                : undefined,
            }}
          >
            {supplier.name}
          </button>
        ))}
      </div>

      {selectedSuppliers.length > 0 ? (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12}
              tick={{ fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => `${value}€`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value: number, name: string) => {
                const supplier = suppliers.find((s) => s.id === name);
                return [formatCurrency(value), supplier?.name || name];
              }}
            />
            <Legend 
              formatter={(value) => {
                const supplier = suppliers.find((s) => s.id === value);
                return supplier?.name || value;
              }}
            />
            {selectedSuppliers.map((supplierId, index) => {
              const supplierIndex = suppliersWithSales.findIndex((s) => s.id === supplierId);
              return (
                <Line
                  key={supplierId}
                  type="monotone"
                  dataKey={supplierId}
                  stroke={CHART_COLORS[supplierIndex % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS[supplierIndex % CHART_COLORS.length], r: 3 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          Sélectionnez au moins un fournisseur pour afficher le graphique
        </div>
      )}

      {suppliersWithSales.length === 0 && (
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          Aucune vente par fournisseur disponible
        </div>
      )}
    </div>
  );
}
