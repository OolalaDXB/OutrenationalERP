import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  FileText,
  ArrowRight,
  CreditCard,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { 
  useFinanceKPIs, 
  useMonthlyRevenue, 
  useTvaBreakdown, 
  useTopProducts,
  useRecentInvoices,
  getDateRange,
  PeriodType 
} from "@/hooks/useFinanceStats";
import { FinanceExportButton } from "@/components/finances/FinanceExportButton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const PERIOD_OPTIONS = [
  { value: "this_month", label: "Ce mois" },
  { value: "last_month", label: "Mois dernier" },
  { value: "this_quarter", label: "Ce trimestre" },
  { value: "this_year", label: "Cette année" },
  { value: "custom", label: "Personnalisé" },
];

const TVA_COLORS: Record<string, string> = {
  "20": "hsl(var(--primary))",
  "5.5": "hsl(var(--chart-2))",
  "0": "hsl(var(--chart-3))",
  "other": "hsl(var(--muted))",
};

const TVA_LABELS: Record<string, string> = {
  "20": "TVA 20%",
  "5.5": "TVA 5.5%",
  "0": "TVA 0% (Export/Intra.)",
  "other": "Autre",
};

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-success/20 text-success border-success/30",
  pending: "bg-warning/20 text-warning border-warning/30",
  sent: "bg-info/20 text-info border-info/30",
  overdue: "bg-danger/20 text-danger border-danger/30",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Payée",
  pending: "En attente",
  sent: "Envoyée",
  overdue: "En retard",
};

function formatCurrency(value: number, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

interface FinancesPageProps {
  onNavigate?: (path: string) => void;
}

export default function FinancesPage({ onNavigate }: FinancesPageProps) {
  const [period, setPeriod] = useState<PeriodType>("this_month");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  
  const { start, end } = useMemo(() => 
    getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );
  
  const { data: kpis, isLoading: kpisLoading } = useFinanceKPIs(start, end, period);
  const { data: monthlyRevenue, isLoading: monthlyLoading } = useMonthlyRevenue();
  const { data: tvaBreakdown, isLoading: tvaLoading } = useTvaBreakdown(start, end);
  const { data: topProducts, isLoading: topProductsLoading } = useTopProducts(start, end, 5);
  const { data: recentInvoices, isLoading: recentLoading } = useRecentInvoices(5);
  
  const chartData = useMemo(() => {
    return (monthlyRevenue || []).map(item => ({
      month: format(parseISO(item.month), "MMM yy", { locale: fr }),
      revenue: Number(item.revenue_ht),
      invoices: item.invoice_count,
    }));
  }, [monthlyRevenue]);
  
  const tvaChartData = useMemo(() => {
    const total = (tvaBreakdown || []).reduce((sum, t) => sum + t.tvaAmount, 0);
    return (tvaBreakdown || []).map(item => ({
      name: TVA_LABELS[item.rate] || `TVA ${item.rate}%`,
      value: item.tvaAmount,
      percent: total > 0 ? (item.tvaAmount / total) * 100 : 0,
      fill: TVA_COLORS[item.rate] || TVA_COLORS.other,
    }));
  }, [tvaBreakdown]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Finances</h1>
            <p className="text-muted-foreground">
              Tableau de bord financier
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {customStart ? format(customStart, "dd/MM/yyyy") : "Début"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">→</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      {customEnd ? format(customEnd, "dd/MM/yyyy") : "Fin"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <FinanceExportButton
              kpis={kpis}
              monthlyRevenue={monthlyRevenue}
              tvaBreakdown={tvaBreakdown}
              periodLabel={PERIOD_OPTIONS.find(o => o.value === period)?.label || period}
            />
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onNavigate?.("/finances/journal")}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Journal des paiements
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onNavigate?.("/finances/impayes")}
            className="gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            Factures impayées
            {(kpis?.overdueCount || 0) > 0 && (
              <Badge variant="destructive" className="ml-1">{kpis?.overdueCount}</Badge>
            )}
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Revenue HT */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Chiffre d'affaires HT</CardDescription>
              {kpisLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CardTitle className="text-2xl">
                  {formatCurrency(kpis?.revenueHT || 0)}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  {(kpis?.revenueChange || 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-danger" />
                  )}
                  <span className={cn(
                    "text-sm font-medium",
                    (kpis?.revenueChange || 0) >= 0 ? "text-success" : "text-danger"
                  )}>
                    {formatPercent(Math.abs(kpis?.revenueChange || 0))}
                  </span>
                  <span className="text-xs text-muted-foreground">vs période préc.</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {kpis?.invoiceCount || 0} factures
              </p>
            </CardContent>
          </Card>

          {/* Gross Margin */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CardDescription>Marge brute</CardDescription>
                {(kpis?.unknownCostCount || 0) > 0 && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Coût non renseigné pour {kpis?.unknownCostCount} produits
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {kpisLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CardTitle className="text-2xl">
                  {formatCurrency(kpis?.grossMargin || 0)}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">
                    {formatPercent(kpis?.marginPercent || 0)}
                  </span>
                  <span className="text-xs text-muted-foreground">du CA</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                {(kpis?.marginChange || 0) >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-danger" />
                )}
                <span className={cn(
                  "text-xs",
                  (kpis?.marginChange || 0) >= 0 ? "text-success" : "text-danger"
                )}>
                  {formatPercent(Math.abs(kpis?.marginChange || 0))} vs préc.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* TVA Collected */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>TVA collectée</CardDescription>
              {kpisLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CardTitle className="text-2xl">
                  {formatCurrency(kpis?.tvaCollected || 0)}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {tvaLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                <div className="space-y-1">
                  {tvaChartData.slice(0, 3).map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Unpaid */}
          <Card className={cn((kpis?.overdueCount || 0) > 0 && "border-danger/50")}>
            <CardHeader className="pb-2">
              <CardDescription>Impayés</CardDescription>
              {kpisLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <CardTitle className="text-2xl">
                  {formatCurrency(kpis?.unpaidTotal || 0)}
                </CardTitle>
              )}
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    {kpis?.unpaidCount || 0} factures en attente
                  </p>
                  {(kpis?.overdueCount || 0) > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-danger">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {kpis?.overdueCount} en retard ({formatCurrency(kpis?.overdueTotal || 0)})
                      </span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">CA mensuel</CardTitle>
              <CardDescription>Évolution sur les 12 derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      className="text-muted-foreground"
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCurrency(value), "CA HT"]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* TVA Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Répartition TVA</CardTitle>
              <CardDescription>Par taux de TVA sur la période</CardDescription>
            </CardHeader>
            <CardContent>
              {tvaLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : tvaChartData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Aucune donnée pour cette période
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={tvaChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${percent.toFixed(0)}%`}
                      labelLine={false}
                    >
                      {tvaChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "TVA 0% (Export/Intra.)" ? "Export & Intracommunautaire" : name
                      ]}
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Row */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Invoice Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Statistiques</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nombre de factures</span>
                <span className="font-medium">{kpis?.invoiceCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Panier moyen</span>
                <span className="font-medium">{formatCurrency(kpis?.avgBasket || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top 5 produits par CA</CardTitle>
            </CardHeader>
            <CardContent>
              {topProductsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(topProducts || []).map((product, idx) => (
                    <div key={product.product_id || idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="truncate">{product.title}</span>
                        {product.sku && (
                          <span className="text-xs text-muted-foreground">({product.sku})</span>
                        )}
                      </div>
                      <span className="font-medium whitespace-nowrap ml-2">
                        {formatCurrency(product.total_revenue)}
                      </span>
                    </div>
                  ))}
                  {(topProducts || []).length === 0 && (
                    <p className="text-muted-foreground text-sm">Aucun produit vendu sur cette période</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Dernières factures</CardTitle>
              <CardDescription>5 factures les plus récentes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1">
              Voir tout <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(recentInvoices || []).map((invoice) => (
                  <div 
                    key={invoice.id} 
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.recipient_name} • {format(parseISO(invoice.issue_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(Number(invoice.total))}</span>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", STATUS_STYLES[invoice.status] || STATUS_STYLES.pending)}
                      >
                        {STATUS_LABELS[invoice.status] || invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {(recentInvoices || []).length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Aucune facture disponible
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
