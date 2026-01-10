import { useState, useMemo } from "react";
import { Warehouse, Package, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { StockIndicator } from "@/components/ui/stock-indicator";
import { useProducts } from "@/hooks/useProducts";

export function InventoryPage() {
  const { data: products = [], isLoading, error } = useProducts();
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");

  // Filtrage
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.artist_name && product.artist_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const stock = product.stock ?? 0;
      const threshold = product.stock_threshold ?? 5;
      let matchesStock = true;
      if (stockFilter === "in_stock") {
        matchesStock = stock > threshold;
      } else if (stockFilter === "low") {
        matchesStock = stock > 0 && stock <= threshold;
      } else if (stockFilter === "out") {
        matchesStock = stock === 0;
      }

      return matchesSearch && matchesStock;
    });
  }, [products, searchTerm, stockFilter]);

  // Stats
  const totalUnits = products.reduce((sum, item) => sum + (item.stock ?? 0), 0);
  const lowStockCount = products.filter((item) => {
    const stock = item.stock ?? 0;
    const threshold = item.stock_threshold ?? 5;
    return stock > 0 && stock <= threshold;
  }).length;
  const outOfStockCount = products.filter((item) => (item.stock ?? 0) === 0).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center text-destructive">
        Erreur lors du chargement de l'inventaire
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard icon={Warehouse} value={totalUnits.toString()} label="Unités en stock" variant="primary" />
        <KpiCard icon={Package} value={products.length.toString()} label="Références" variant="info" />
        <KpiCard icon={AlertTriangle} value={lowStockCount.toString()} label="Stock faible" variant="warning" />
        <KpiCard icon={XCircle} value={outOfStockCount.toString()} label="Ruptures" variant="danger" />
      </div>

      {/* Inventory Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">État des stocks</h2>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
            <select
              className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              <option value="all">Tous les états</option>
              <option value="in_stock">En stock</option>
              <option value="low">Stock faible</option>
              <option value="out">Rupture</option>
            </select>
            <input
              type="text"
              placeholder="Rechercher produit, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
            />
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Produit</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">SKU</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Stock</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Seuil</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Emplacement</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.artist_name || '—'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{item.sku}</td>
                  <td className="px-6 py-4">
                    <StockIndicator current={item.stock ?? 0} threshold={item.stock_threshold ?? 5} />
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{item.stock_threshold ?? 5}</td>
                  <td className="px-6 py-4 text-sm font-mono">{item.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">
              Aucun produit trouvé
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
