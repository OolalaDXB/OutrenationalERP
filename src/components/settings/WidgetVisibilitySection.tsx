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
  Layers
} from "lucide-react";

export interface WidgetVisibility {
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

export const defaultWidgetVisibility: WidgetVisibility = {
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

const widgetConfig: { key: keyof WidgetVisibility; label: string; description: string; icon: typeof TrendingUp }[] = [
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

  const enabledCount = Object.values(visibility).filter(Boolean).length;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Widgets Analytics</h2>
        <span className="text-sm text-muted-foreground">
          {enabledCount}/{widgetConfig.length} actifs
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Choisissez les graphiques et widgets à afficher sur la page Analytics.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {widgetConfig.map(({ key, label, description, icon: Icon }) => (
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

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onChange(defaultWidgetVisibility)}
          className="text-xs text-primary hover:underline"
        >
          Tout activer
        </button>
        <span className="text-xs text-muted-foreground">•</span>
        <button
          onClick={() => {
            const allFalse: WidgetVisibility = {
              kpi_cards: false,
              profitability_summary: false,
              sales_evolution: false,
              cost_breakdown: false,
              top_profit_products: false,
              top_customers: false,
              supplier_stats: false,
              supplier_sales_evolution: false,
              orders_by_month: false,
              stock_by_format: false,
              products_by_currency: false,
            };
            onChange(allFalse);
          }}
          className="text-xs text-muted-foreground hover:underline"
        >
          Tout désactiver
        </button>
      </div>
    </div>
  );
}
