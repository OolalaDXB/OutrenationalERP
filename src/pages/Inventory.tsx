import { useState, useMemo, useCallback } from "react";
import { Warehouse, Package, AlertTriangle, XCircle, Loader2, Edit, Download } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { StockIndicator } from "@/components/ui/stock-indicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useProducts, Product } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { BulkStockAdjustmentModal } from "@/components/inventory/BulkStockAdjustmentModal";
import { toast } from "@/hooks/use-toast";

export function InventoryPage() {
  const { data: products = [], isLoading, error } = useProducts();
  const { canWrite } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);

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

  // CSV Export function
  const exportToCSV = useCallback(() => {
    const dataToExport = filteredProducts;
    
    if (dataToExport.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucun produit à exporter", variant: "destructive" });
      return;
    }

    // CSV headers
    const headers = [
      "SKU",
      "Titre",
      "Artiste",
      "Stock",
      "Seuil",
      "Emplacement",
      "Format",
      "Prix vente",
      "Prix achat",
      "Statut stock"
    ];

    // CSV rows
    const rows = dataToExport.map(product => {
      const stock = product.stock ?? 0;
      const threshold = product.stock_threshold ?? 5;
      let stockStatus = "En stock";
      if (stock === 0) stockStatus = "Rupture";
      else if (stock <= threshold) stockStatus = "Stock faible";

      return [
        product.sku,
        `"${(product.title || '').replace(/"/g, '""')}"`,
        `"${(product.artist_name || '').replace(/"/g, '""')}"`,
        stock.toString(),
        threshold.toString(),
        `"${(product.location || '').replace(/"/g, '""')}"`,
        product.format || '',
        product.selling_price?.toString() || '',
        product.cost_price?.toString() || '',
        stockStatus
      ].join(";");
    });

    // Combine headers and rows
    const csvContent = [headers.join(";"), ...rows].join("\n");
    
    // Create blob and download
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventaire_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Export réussi", description: `${dataToExport.length} produit(s) exporté(s)` });
  }, [filteredProducts]);

  // Stats
  const totalUnits = products.reduce((sum, item) => sum + (item.stock ?? 0), 0);
  const lowStockCount = products.filter((item) => {
    const stock = item.stock ?? 0;
    const threshold = item.stock_threshold ?? 5;
    return stock > 0 && stock <= threshold;
  }).length;
  const outOfStockCount = products.filter((item) => (item.stock ?? 0) === 0).length;

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedIds.has(p.id));
  }, [products, selectedIds]);

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

  const allSelected = filteredProducts.length > 0 && selectedIds.size === filteredProducts.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredProducts.length;

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
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-lg font-semibold">État des stocks</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Button>
            {canWrite() && selectedIds.size > 0 && (
              <Button onClick={() => setShowBulkModal(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Ajuster {selectedIds.size} produit(s)
              </Button>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap items-center">
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
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Désélectionner ({selectedIds.size})
              </Button>
            )}
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                {canWrite() && (
                  <th className="w-12 px-4 py-3 bg-secondary border-b border-border">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          (el as any).indeterminate = someSelected;
                        }
                      }}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                )}
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Produit</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">SKU</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Stock</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Seuil</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Emplacement</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => (
                <tr 
                  key={item.id} 
                  className={`border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors ${
                    selectedIds.has(item.id) ? 'bg-primary/5' : ''
                  }`}
                >
                  {canWrite() && (
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    </td>
                  )}
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

      {/* Bulk Adjustment Modal */}
      <BulkStockAdjustmentModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        selectedProducts={selectedProducts}
        onSuccess={clearSelection}
      />
    </div>
  );
}
