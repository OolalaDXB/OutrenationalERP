import { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, TrendingUp, TrendingDown, Package, Search, Filter, Calendar, X, Download } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductDrawer } from "@/components/drawers/ProductDrawer";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useAllStockMovements, type StockMovementWithProduct } from "@/hooks/useAllStockMovements";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type StockMovementType = Database['public']['Enums']['stock_movement_type'];

const typeStyles: Record<StockMovementType, { icon: typeof ArrowUpCircle; color: string; bg: string; label: string }> = {
  purchase: { icon: ArrowUpCircle, color: "text-success", bg: "bg-success/10", label: "Achat" },
  sale: { icon: ArrowDownCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Vente" },
  return: { icon: RefreshCw, color: "text-info", bg: "bg-info/10", label: "Retour" },
  adjustment: { icon: RefreshCw, color: "text-warning-foreground", bg: "bg-warning/10", label: "Ajustement" },
  loss: { icon: ArrowDownCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Perte" },
  consignment_in: { icon: ArrowUpCircle, color: "text-primary", bg: "bg-primary/10", label: "Entrée consignation" },
  consignment_out: { icon: ArrowDownCircle, color: "text-primary", bg: "bg-primary/10", label: "Sortie consignation" },
};

const periodPresets = [
  { value: "today", label: "Aujourd'hui" },
  { value: "yesterday", label: "Hier" },
  { value: "7days", label: "7 derniers jours" },
  { value: "30days", label: "30 derniers jours" },
  { value: "thisMonth", label: "Ce mois" },
  { value: "lastMonth", label: "Mois dernier" },
  { value: "thisYear", label: "Cette année" },
  { value: "custom", label: "Personnalisé" },
];

function getDateRange(preset: string): { start: string; end: string } | null {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");
  
  switch (preset) {
    case "today":
      return { start: today, end: today };
    case "yesterday":
      const yesterday = format(subDays(now, 1), "yyyy-MM-dd");
      return { start: yesterday, end: yesterday };
    case "7days":
      return { start: format(subDays(now, 7), "yyyy-MM-dd"), end: today };
    case "30days":
      return { start: format(subDays(now, 30), "yyyy-MM-dd"), end: today };
    case "thisMonth":
      return { start: format(startOfMonth(now), "yyyy-MM-dd"), end: today };
    case "lastMonth":
      const lastMonth = subDays(startOfMonth(now), 1);
      return { start: format(startOfMonth(lastMonth), "yyyy-MM-dd"), end: format(endOfMonth(lastMonth), "yyyy-MM-dd") };
    case "thisYear":
      return { start: format(startOfYear(now), "yyyy-MM-dd"), end: today };
    default:
      return null;
  }
}

export function StockMovementsPage() {
  const { data: dbProducts = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [periodPreset, setPeriodPreset] = useState("30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Drawer
  const [selectedProduct, setSelectedProduct] = useState<typeof dbProducts[0] | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Calculate date range
  const dateRange = useMemo(() => {
    if (periodPreset === "custom") {
      return customStartDate && customEndDate ? { start: customStartDate, end: customEndDate } : null;
    }
    return getDateRange(periodPreset);
  }, [periodPreset, customStartDate, customEndDate]);

  // Fetch movements with filters
  const { data: movements = [], isLoading } = useAllStockMovements({
    type: typeFilter,
    supplierId: supplierFilter,
    startDate: dateRange?.start,
    endDate: dateRange?.end,
    search: searchTerm,
    limit: 500
  });

  // Stats
  const stats = useMemo(() => {
    const entries = movements.filter(m => 
      m.type === "purchase" || m.type === "return" || m.type === "consignment_in"
    ).reduce((sum, m) => sum + m.quantity, 0);
    
    const exits = movements.filter(m => 
      m.type === "sale" || m.type === "loss" || m.type === "consignment_out"
    ).reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    
    const adjustments = movements.filter(m => m.type === "adjustment").length;
    const netChange = entries - exits;

    return { entries, exits, adjustments, netChange };
  }, [movements]);

  const handleProductClick = (productId: string) => {
    const product = dbProducts.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setIsDrawerOpen(true);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setSupplierFilter("all");
    setPeriodPreset("30days");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  const hasActiveFilters = typeFilter !== "all" || supplierFilter !== "all" || periodPreset !== "30days" || searchTerm !== "";

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard icon={TrendingUp} value={`+${stats.entries}`} label="Entrées totales" variant="success" />
        <KpiCard icon={TrendingDown} value={`-${stats.exits}`} label="Sorties totales" variant="danger" />
        <KpiCard icon={RefreshCw} value={stats.adjustments.toString()} label="Ajustements" variant="info" />
        <KpiCard
          icon={Package}
          value={stats.netChange >= 0 ? `+${stats.netChange}` : stats.netChange.toString()}
          label="Variation nette"
          variant={stats.netChange >= 0 ? "success" : "warning"}
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher produit, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Type filter */}
          <select
            className="px-3 py-2 rounded-md border border-border bg-background text-sm cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="purchase">Achats</option>
            <option value="sale">Ventes</option>
            <option value="return">Retours</option>
            <option value="adjustment">Ajustements</option>
            <option value="loss">Pertes</option>
            <option value="consignment_in">Entrées consignation</option>
            <option value="consignment_out">Sorties consignation</option>
          </select>

          {/* Period filter */}
          <select
            className="px-3 py-2 rounded-md border border-border bg-background text-sm cursor-pointer"
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value)}
          >
            {periodPresets.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          {/* Advanced filters toggle */}
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtres
          </Button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2 text-muted-foreground">
              <X className="w-4 h-4" />
              Effacer
            </Button>
          )}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Supplier filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Fournisseur</label>
              <select
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
              >
                <option value="all">Tous les fournisseurs</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Custom date range */}
            {periodPreset === "custom" && (
              <>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Date début</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Date fin</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{movements.length} mouvement(s) trouvé(s)</span>
        {dateRange && (
          <span>
            Période: {format(new Date(dateRange.start), "d MMM yyyy", { locale: fr })} - {format(new Date(dateRange.end), "d MMM yyyy", { locale: fr })}
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            Chargement des mouvements...
          </div>
        ) : (
          <div className="divide-y divide-border">
            {movements.map((movement) => {
              const typeInfo = typeStyles[movement.type];
              const Icon = typeInfo.icon;

              return (
                <div 
                  key={movement.id} 
                  className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => handleProductClick(movement.product_id)}
                >
                  <div className={`w-10 h-10 rounded-full ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate hover:text-primary transition-colors">
                        {movement.products?.title || "Produit inconnu"}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {movement.products?.sku || "—"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {movement.products?.artist_name || "—"}
                    </div>
                  </div>

                  <div className="text-center px-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <div className={`font-bold tabular-nums ${
                      movement.type === "purchase" || movement.type === "return" || movement.type === "consignment_in"
                        ? "text-success" 
                        : "text-destructive"
                    }`}>
                      {movement.type === "purchase" || movement.type === "return" || movement.type === "consignment_in" ? "+" : "-"}
                      {movement.quantity}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {movement.stock_before} → {movement.stock_after}
                    </div>
                  </div>

                  <div className="text-right min-w-[120px]">
                    <div className="text-sm font-medium">{movement.reason || "—"}</div>
                    <div className="text-xs text-muted-foreground">{movement.reference || "—"}</div>
                  </div>

                  <div className="text-right min-w-[100px]">
                    <div className="text-sm text-muted-foreground">
                      {movement.created_at ? formatDate(movement.created_at) : "—"}
                    </div>
                    {movement.suppliers?.name && (
                      <div className="text-xs text-muted-foreground">{movement.suppliers.name}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && movements.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            Aucun mouvement trouvé
          </div>
        )}
      </div>

      {/* Product Drawer */}
      <ProductDrawer
        product={selectedProduct}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
