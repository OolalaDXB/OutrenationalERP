import { useState, useMemo } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockIndicator } from "@/components/ui/stock-indicator";
import { products, suppliers, formatCurrency } from "@/data/demo-data";

const formatLabels: Record<string, string> = {
  lp: "LP",
  "2lp": "2×LP",
  cd: "CD",
  boxset: "Box Set",
  "7inch": '7"',
  cassette: "K7",
};

export function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");

  // Formats uniques
  const formats = useMemo(() => {
    const unique = new Set(products.map((p) => p.format));
    return Array.from(unique);
  }, []);

  // Filtrage
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSupplier = supplierFilter === "all" || product.supplierId === supplierFilter;
      const matchesFormat = formatFilter === "all" || product.format === formatFilter;

      let matchesStock = true;
      if (stockFilter === "in_stock") {
        matchesStock = product.stock > product.threshold;
      } else if (stockFilter === "low") {
        matchesStock = product.stock > 0 && product.stock <= product.threshold;
      } else if (stockFilter === "out") {
        matchesStock = product.stock === 0;
      }

      return matchesSearch && matchesSupplier && matchesFormat && matchesStock;
    });
  }, [searchTerm, supplierFilter, formatFilter, stockFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les produits</h2>
          <p className="text-sm text-muted-foreground">{filteredProducts.length} références</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau produit
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="all">Tous les fournisseurs</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
          >
            <option value="all">Tous les formats</option>
            {formats.map((f) => (
              <option key={f} value={f}>{formatLabels[f] || f.toUpperCase()}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="all">Tous les stocks</option>
            <option value="in_stock">En stock</option>
            <option value="low">Stock faible</option>
            <option value="out">Rupture</option>
          </select>
          <input
            type="text"
            placeholder="Rechercher produit, artiste, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Produit</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Fournisseur</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Format</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Prix</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Stock</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Emplacement</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center">
                        <span className="text-[0.6rem] text-muted-foreground/50">VINYL</span>
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{product.title}</div>
                      <div className="text-xs text-muted-foreground">{product.artist} · {product.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{product.supplierName}</td>
                <td className="px-6 py-4 text-sm">{formatLabels[product.format] || product.format.toUpperCase()}</td>
                <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(product.sellingPrice)}</td>
                <td className="px-6 py-4">
                  <StockIndicator current={product.stock} threshold={product.threshold} />
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{product.location}</td>
                <td className="px-6 py-4">
                  <button className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
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
  );
}
