import { useState, useMemo } from "react";
import { ArrowUpCircle, ArrowDownCircle, Package, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { products, orders, suppliers, formatDate } from "@/data/demo-data";

type MovementType = "entry" | "exit" | "adjustment";

interface StockMovement {
  id: string;
  productId: string;
  productTitle: string;
  productSku: string;
  artist: string;
  type: MovementType;
  quantity: number;
  reason: string;
  reference: string;
  previousStock: number;
  newStock: number;
  createdAt: string;
}

// Générer des mouvements depuis les données existantes
const generateMovements = (): StockMovement[] => {
  const movements: StockMovement[] = [];
  let movementId = 1;

  // Sorties depuis les commandes
  orders.forEach((order) => {
    if (order.status === "cancelled") return;

    order.items.forEach((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return;

      movements.push({
        id: `mov-${movementId++}`,
        productId: item.productId,
        productTitle: item.productTitle,
        productSku: product.sku,
        artist: item.artist,
        type: "exit",
        quantity: -item.quantity,
        reason: "Vente",
        reference: order.orderNumber,
        previousStock: product.stock + item.quantity,
        newStock: product.stock,
        createdAt: order.createdAt,
      });
    });
  });

  // Entrées simulées (réappros passées)
  products.slice(0, 8).forEach((product, index) => {
    const supplier = suppliers.find((s) => s.id === product.supplierId);
    const entryDate = new Date();
    entryDate.setDate(entryDate.getDate() - (index * 5 + 10));

    movements.push({
      id: `mov-${movementId++}`,
      productId: product.id,
      productTitle: product.title,
      productSku: product.sku,
      artist: product.artist,
      type: "entry",
      quantity: Math.floor(Math.random() * 20) + 10,
      reason: "Réapprovisionnement",
      reference: supplier?.name || "Fournisseur",
      previousStock: product.stock - 15,
      newStock: product.stock,
      createdAt: entryDate.toISOString(),
    });
  });

  // Ajustements d'inventaire simulés
  products.slice(2, 5).forEach((product, index) => {
    const adjustDate = new Date();
    adjustDate.setDate(adjustDate.getDate() - (index * 3 + 2));

    const adjustQty = Math.random() > 0.5 ? -1 : 1;
    movements.push({
      id: `mov-${movementId++}`,
      productId: product.id,
      productTitle: product.title,
      productSku: product.sku,
      artist: product.artist,
      type: "adjustment",
      quantity: adjustQty,
      reason: "Inventaire",
      reference: "Correction stock",
      previousStock: product.stock - adjustQty,
      newStock: product.stock,
      createdAt: adjustDate.toISOString(),
    });
  });

  return movements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const movements = generateMovements();

const typeStyles: Record<MovementType, { icon: typeof ArrowUpCircle; color: string; bg: string; label: string }> = {
  entry: { icon: ArrowUpCircle, color: "text-success", bg: "bg-success-light", label: "Entrée" },
  exit: { icon: ArrowDownCircle, color: "text-danger", bg: "bg-danger-light", label: "Sortie" },
  adjustment: { icon: RefreshCw, color: "text-info", bg: "bg-info-light", label: "Ajustement" },
};

export function StockMovementsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  // Filtrage
  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const matchesSearch =
        searchTerm === "" ||
        movement.productTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        movement.reference.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === "all" || movement.type === typeFilter;

      let matchesPeriod = true;
      if (periodFilter !== "all") {
        const movementDate = new Date(movement.createdAt);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - movementDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (periodFilter === "today") matchesPeriod = diffDays === 0;
        else if (periodFilter === "week") matchesPeriod = diffDays <= 7;
        else if (periodFilter === "month") matchesPeriod = diffDays <= 30;
      }

      return matchesSearch && matchesType && matchesPeriod;
    });
  }, [searchTerm, typeFilter, periodFilter]);

  // Stats
  const stats = useMemo(() => {
    const entries = movements.filter((m) => m.type === "entry").reduce((sum, m) => sum + m.quantity, 0);
    const exits = movements.filter((m) => m.type === "exit").reduce((sum, m) => sum + Math.abs(m.quantity), 0);
    const adjustments = movements.filter((m) => m.type === "adjustment").length;
    const netChange = entries - exits;

    return { entries, exits, adjustments, netChange };
  }, []);

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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">Tous les types</option>
          <option value="entry">Entrées</option>
          <option value="exit">Sorties</option>
          <option value="adjustment">Ajustements</option>
        </select>
        <select
          className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
        >
          <option value="all">Toutes les périodes</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">7 derniers jours</option>
          <option value="month">30 derniers jours</option>
        </select>
        <input
          type="text"
          placeholder="Rechercher produit, SKU, référence..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
        />
      </div>

      {/* Timeline */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {filteredMovements.map((movement) => {
            const typeInfo = typeStyles[movement.type];
            const Icon = typeInfo.icon;

            return (
              <div key={movement.id} className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors">
                <div className={`w-10 h-10 rounded-full ${typeInfo.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${typeInfo.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold truncate">{movement.productTitle}</span>
                    <span className="text-xs text-muted-foreground font-mono">{movement.productSku}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">{movement.artist}</div>
                </div>

                <div className="text-center px-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                </div>

                <div className="text-right min-w-[100px]">
                  <div className={`font-bold tabular-nums ${movement.quantity > 0 ? "text-success" : "text-danger"}`}>
                    {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {movement.previousStock} → {movement.newStock}
                  </div>
                </div>

                <div className="text-right min-w-[120px]">
                  <div className="text-sm font-medium">{movement.reason}</div>
                  <div className="text-xs text-muted-foreground">{movement.reference}</div>
                </div>

                <div className="text-right min-w-[100px]">
                  <div className="text-sm text-muted-foreground">{formatDate(movement.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredMovements.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            Aucun mouvement trouvé
          </div>
        )}
      </div>
    </div>
  );
}
