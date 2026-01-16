import { Switch } from "@/components/ui/switch";
import { 
  TrendingUp, 
  DollarSign, 
  LineChart, 
  PieChart, 
  Package, 
  Users, 
  Truck, 
  BarChart3,
  CircleDollarSign,
  Layers,
  CalendarClock,
  Table
} from "lucide-react";

// Dashboard widgets
export interface DashboardWidgetVisibility {
  dashboard_kpi_cards: boolean;
  dashboard_payment_deadlines: boolean;
  dashboard_supplier_performance: boolean;
}

// Analytics widgets
export interface AnalyticsWidgetVisibility {
  kpi_cards: boolean;
  profitability_summary: boolean;
  sales_evolution: boolean;
  cost_breakdown: boolean;
  top_profit_products: boolean;
  top_customers: boolean;
  supplier_stats: boolean;
  supplier_sales_evolution: boolean;
  orders_by_month: boolean;
  stock_by_format: boolean;
  products_by_currency: boolean;
}

// Combined visibility
export interface WidgetVisibility extends DashboardWidgetVisibility, AnalyticsWidgetVisibility {}

export const defaultWidgetVisibility: WidgetVisibility = {
  // Dashboard
  dashboard_kpi_cards: true,
  dashboard_payment_deadlines: true,
  dashboard_supplier_performance: true,
  // Analytics
  kpi_cards: true,
  profitability_summary: true,
  sales_evolution: true,
  cost_breakdown: true,
  top_profit_products: true,
  top_customers: true,
  supplier_stats: true,
  supplier_sales_evolution: true,
  orders_by_month: true,
  stock_by_format: true,
  products_by_currency: true,
};

type WidgetConfig = { key: keyof WidgetVisibility; label: string; description: string; icon: typeof TrendingUp };

const dashboardWidgetConfig: WidgetConfig[] = [
  { key: "dashboard_kpi_cards", label: "Cartes KPI", description: "CA, commandes, nouveaux clients, alertes stock", icon: TrendingUp },
  { key: "dashboard_payment_deadlines", label: "Échéances de paiement", description: "Prochains versements fournisseurs", icon: CalendarClock },
  { key: "dashboard_supplier_performance", label: "Performance fournisseurs", description: "Tableau des ventes par fournisseur", icon: Table },
];

const analyticsWidgetConfig: WidgetConfig[] = [
  { key: "kpi_cards", label: "Cartes KPI", description: "CA, commandes, clients, produits, marge", icon: TrendingUp },
  { key: "profitability_summary", label: "Résumé de rentabilité", description: "Vue d'ensemble des coûts et marges du stock", icon: DollarSign },
  { key: "sales_evolution", label: "Évolution des ventes", description: "Graphique linéaire des ventes mensuelles", icon: LineChart },
  { key: "cost_breakdown", label: "Répartition des coûts", description: "Camembert des différents types de coûts", icon: PieChart },
  { key: "top_profit_products", label: "Top produits par marge", description: "Tableau des 10 produits les plus rentables", icon: Package },
  { key: "top_customers", label: "Top clients", description: "Classement des meilleurs clients", icon: Users },
  { key: "supplier_stats", label: "Stats fournisseurs", description: "Performance par fournisseur", icon: Truck },
  { key: "supplier_sales_evolution", label: "Évolution ventes fournisseurs", description: "Graphique évolution par fournisseur", icon: BarChart3 },
  { key: "orders_by_month", label: "Commandes par mois", description: "Histogramme des commandes mensuelles", icon: BarChart3 },
  { key: "stock_by_format", label: "Stock par format", description: "Répartition LP, CD, etc.", icon: Layers },
  { key: "products_by_currency", label: "Produits par devise", description: "Répartition EUR/USD", icon: CircleDollarSign },
];

interface WidgetVisibilitySectionProps {
  visibility: WidgetVisibility;
  onChange: (visibility: WidgetVisibility) => void;
}

export function WidgetVisibilitySection({ visibility, onChange }: WidgetVisibilitySectionProps) {
  const handleToggle = (key: keyof WidgetVisibility, checked: boolean) => {
    onChange({ ...visibility, [key]: checked });
  };

  const allWidgets = [...dashboardWidgetConfig, ...analyticsWidgetConfig];
  const enabledCount = Object.values(visibility).filter(Boolean).length;

  const renderWidgetGrid = (config: WidgetConfig[], title: string) => (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {config.map(({ key, label, description, icon: Icon }) => (
          <div 
            key={key}
            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
              visibility[key] 
                ? "bg-primary/5 border-primary/20" 
                : "bg-secondary/30 border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                visibility[key] ? "bg-primary/10" : "bg-muted"
              }`}>
                <Icon className={`w-4.5 h-4.5 ${visibility[key] ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className={`font-medium text-sm ${visibility[key] ? "" : "text-muted-foreground"}`}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
            <Switch
              checked={visibility[key]}
              onCheckedChange={(checked) => handleToggle(key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const setAllTo = (value: boolean) => {
    const newVisibility = { ...visibility };
    allWidgets.forEach(({ key }) => {
      newVisibility[key] = value;
    });
    onChange(newVisibility);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Personnalisation des widgets</h2>
        <span className="text-sm text-muted-foreground">
          {enabledCount}/{allWidgets.length} actifs
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Choisissez les graphiques et widgets à afficher sur le Dashboard et la page Analytics.
      </p>

      {renderWidgetGrid(dashboardWidgetConfig, "Dashboard")}
      {renderWidgetGrid(analyticsWidgetConfig, "Analytics")}

      <div className="flex gap-2">
        <button
          onClick={() => setAllTo(true)}
          className="text-xs text-primary hover:underline"
        >
          Tout activer
        </button>
        <span className="text-xs text-muted-foreground">•</span>
        <button
          onClick={() => setAllTo(false)}
          className="text-xs text-muted-foreground hover:underline"
        >
          Tout désactiver
        </button>
      </div>
    </div>
  );
}
