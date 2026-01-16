import { useState, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
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
  Table,
  GripVertical,
  LayoutTemplate,
  Eye,
  EyeOff,
  Sparkles
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Dashboard widgets
export interface DashboardWidgetVisibility {
  dashboard_kpi_cards: boolean;
  dashboard_payment_deadlines: boolean;
  dashboard_supplier_performance: boolean;
  dashboard_monthly_sales: boolean;
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

// Widget order configuration
export interface WidgetOrder {
  dashboard: (keyof DashboardWidgetVisibility)[];
  analytics: (keyof AnalyticsWidgetVisibility)[];
}

export const defaultWidgetVisibility: WidgetVisibility = {
  // Dashboard
  dashboard_kpi_cards: true,
  dashboard_payment_deadlines: true,
  dashboard_supplier_performance: true,
  dashboard_monthly_sales: true,
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

export const defaultWidgetOrder: WidgetOrder = {
  dashboard: ["dashboard_kpi_cards", "dashboard_monthly_sales", "dashboard_payment_deadlines", "dashboard_supplier_performance"],
  analytics: [
    "kpi_cards",
    "profitability_summary",
    "sales_evolution",
    "cost_breakdown",
    "top_profit_products",
    "top_customers",
    "supplier_stats",
    "supplier_sales_evolution",
    "orders_by_month",
    "stock_by_format",
    "products_by_currency",
  ],
};

// Presets
type PresetKey = "complete" | "simplified" | "custom";

const presets: Record<PresetKey, { label: string; description: string; icon: typeof LayoutTemplate; visibility: WidgetVisibility }> = {
  complete: {
    label: "Vue complète",
    description: "Tous les widgets activés",
    icon: Eye,
    visibility: defaultWidgetVisibility,
  },
  simplified: {
    label: "Vue simplifiée",
    description: "Widgets essentiels uniquement",
    icon: EyeOff,
    visibility: {
      dashboard_kpi_cards: true,
      dashboard_payment_deadlines: false,
      dashboard_supplier_performance: false,
      dashboard_monthly_sales: true,
      kpi_cards: true,
      profitability_summary: true,
      sales_evolution: true,
      cost_breakdown: false,
      top_profit_products: false,
      top_customers: false,
      supplier_stats: false,
      supplier_sales_evolution: false,
      orders_by_month: false,
      stock_by_format: false,
      products_by_currency: false,
    },
  },
  custom: {
    label: "Personnalisée",
    description: "Configurez manuellement",
    icon: Sparkles,
    visibility: defaultWidgetVisibility,
  },
};

type WidgetConfig = { key: keyof WidgetVisibility; label: string; description: string; icon: typeof TrendingUp };

const dashboardWidgetConfig: Record<keyof DashboardWidgetVisibility, WidgetConfig> = {
  dashboard_kpi_cards: { key: "dashboard_kpi_cards", label: "Cartes KPI", description: "CA, commandes, nouveaux clients, alertes stock", icon: TrendingUp },
  dashboard_monthly_sales: { key: "dashboard_monthly_sales", label: "Ventes mensuelles", description: "Graphique des ventes sur 12 mois", icon: LineChart },
  dashboard_payment_deadlines: { key: "dashboard_payment_deadlines", label: "Échéances de paiement", description: "Prochains versements fournisseurs", icon: CalendarClock },
  dashboard_supplier_performance: { key: "dashboard_supplier_performance", label: "Performance fournisseurs", description: "Tableau des ventes par fournisseur", icon: Table },
};

const analyticsWidgetConfig: Record<keyof AnalyticsWidgetVisibility, WidgetConfig> = {
  kpi_cards: { key: "kpi_cards", label: "Cartes KPI", description: "CA, commandes, clients, produits, marge", icon: TrendingUp },
  profitability_summary: { key: "profitability_summary", label: "Résumé de rentabilité", description: "Vue d'ensemble des coûts et marges du stock", icon: DollarSign },
  sales_evolution: { key: "sales_evolution", label: "Évolution des ventes", description: "Graphique linéaire des ventes mensuelles", icon: LineChart },
  cost_breakdown: { key: "cost_breakdown", label: "Répartition des coûts", description: "Camembert des différents types de coûts", icon: PieChart },
  top_profit_products: { key: "top_profit_products", label: "Top produits par marge", description: "Tableau des 10 produits les plus rentables", icon: Package },
  top_customers: { key: "top_customers", label: "Top clients", description: "Classement des meilleurs clients", icon: Users },
  supplier_stats: { key: "supplier_stats", label: "Stats fournisseurs", description: "Performance par fournisseur", icon: Truck },
  supplier_sales_evolution: { key: "supplier_sales_evolution", label: "Évolution ventes fournisseurs", description: "Graphique évolution par fournisseur", icon: BarChart3 },
  orders_by_month: { key: "orders_by_month", label: "Commandes par mois", description: "Histogramme des commandes mensuelles", icon: BarChart3 },
  stock_by_format: { key: "stock_by_format", label: "Stock par format", description: "Répartition LP, CD, etc.", icon: Layers },
  products_by_currency: { key: "products_by_currency", label: "Produits par devise", description: "Répartition EUR/USD", icon: CircleDollarSign },
};

// Sortable widget item
interface SortableWidgetItemProps {
  id: string;
  config: WidgetConfig;
  isEnabled: boolean;
  onToggle: (checked: boolean) => void;
}

function SortableWidgetItem({ id, config, isEnabled, onToggle }: SortableWidgetItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const Icon = config.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
        isEnabled 
          ? "bg-primary/5 border-primary/20" 
          : "bg-secondary/30 border-transparent"
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground touch-none"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          isEnabled ? "bg-primary/10" : "bg-muted"
        }`}>
          <Icon className={`w-4.5 h-4.5 ${isEnabled ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className={`font-medium text-sm ${isEnabled ? "" : "text-muted-foreground"}`}>
            {config.label}
          </p>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>
      <Switch
        checked={isEnabled}
        onCheckedChange={onToggle}
      />
    </div>
  );
}

interface WidgetVisibilitySectionProps {
  visibility: WidgetVisibility;
  order: WidgetOrder;
  onChange: (visibility: WidgetVisibility, order: WidgetOrder) => void;
}

export function WidgetVisibilitySection({ visibility, order, onChange }: WidgetVisibilitySectionProps) {
  const [activePreset, setActivePreset] = useState<PresetKey>("custom");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleToggle = useCallback((key: keyof WidgetVisibility, checked: boolean) => {
    setActivePreset("custom");
    onChange({ ...visibility, [key]: checked }, order);
  }, [visibility, order, onChange]);

  const handleDashboardDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = order.dashboard.indexOf(active.id as keyof DashboardWidgetVisibility);
      const newIndex = order.dashboard.indexOf(over.id as keyof DashboardWidgetVisibility);
      const newOrder = {
        ...order,
        dashboard: arrayMove(order.dashboard, oldIndex, newIndex),
      };
      onChange(visibility, newOrder);
    }
  }, [order, visibility, onChange]);

  const handleAnalyticsDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = order.analytics.indexOf(active.id as keyof AnalyticsWidgetVisibility);
      const newIndex = order.analytics.indexOf(over.id as keyof AnalyticsWidgetVisibility);
      const newOrder = {
        ...order,
        analytics: arrayMove(order.analytics, oldIndex, newIndex),
      };
      onChange(visibility, newOrder);
    }
  }, [order, visibility, onChange]);

  const applyPreset = (presetKey: PresetKey) => {
    setActivePreset(presetKey);
    if (presetKey !== "custom") {
      onChange(presets[presetKey].visibility, order);
    }
  };

  const allWidgetKeys = [...Object.keys(dashboardWidgetConfig), ...Object.keys(analyticsWidgetConfig)];
  const enabledCount = allWidgetKeys.filter(key => visibility[key as keyof WidgetVisibility]).length;

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <LayoutTemplate className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Préréglages</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.entries(presets) as [PresetKey, typeof presets.complete][]).map(([key, preset]) => {
            const Icon = preset.icon;
            const isActive = activePreset === key;
            return (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`p-4 rounded-lg border text-left transition-all ${
                  isActive
                    ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                    : "bg-secondary/30 border-transparent hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isActive ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`font-medium ${isActive ? "text-primary" : ""}`}>{preset.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Widgets configuration */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Configuration des widgets</h2>
          <span className="text-sm text-muted-foreground">
            {enabledCount}/{allWidgetKeys.length} actifs
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Glissez-déposez pour réorganiser l'ordre d'affichage.
        </p>

        {/* Dashboard widgets */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Dashboard</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDashboardDragEnd}
          >
            <SortableContext items={order.dashboard} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {order.dashboard.map((key) => (
                  <SortableWidgetItem
                    key={key}
                    id={key}
                    config={dashboardWidgetConfig[key]}
                    isEnabled={visibility[key]}
                    onToggle={(checked) => handleToggle(key, checked)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Analytics widgets */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Analytics</h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleAnalyticsDragEnd}
          >
            <SortableContext items={order.analytics} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {order.analytics.map((key) => (
                  <SortableWidgetItem
                    key={key}
                    id={key}
                    config={analyticsWidgetConfig[key]}
                    isEnabled={visibility[key]}
                    onToggle={(checked) => handleToggle(key, checked)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => applyPreset("complete")}
            className="text-xs"
          >
            Tout activer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const allFalse = Object.fromEntries(
                allWidgetKeys.map(k => [k, false])
              ) as WidgetVisibility;
              onChange(allFalse, order);
              setActivePreset("custom");
            }}
            className="text-xs text-muted-foreground"
          >
            Tout désactiver
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(visibility, defaultWidgetOrder)}
            className="text-xs text-muted-foreground ml-auto"
          >
            Réinitialiser l'ordre
          </Button>
        </div>
      </div>
    </div>
  );
}
