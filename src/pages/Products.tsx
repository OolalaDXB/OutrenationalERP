import { Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockIndicator } from "@/components/ui/stock-indicator";

// Demo data
const products = [
  { 
    id: "1", 
    sku: "VLP-001", 
    title: "Khmer Rouge Survivors", 
    artist: "Various Artists",
    supplier: "Sublime Frequencies",
    format: "LP",
    price: 27.00,
    stock: 12,
    threshold: 10,
    location: "A-12"
  },
  { 
    id: "2", 
    sku: "VLP-002", 
    title: "Synthesizer Meditation", 
    artist: "Mort Garson",
    supplier: "Numero Group",
    format: "LP",
    price: 29.00,
    stock: 5,
    threshold: 10,
    location: "A-15"
  },
  { 
    id: "3", 
    sku: "VLP-003", 
    title: "Music From the Morning of the World", 
    artist: "Various Artists",
    supplier: "Mississippi Records",
    format: "2LP",
    price: 35.00,
    stock: 0,
    threshold: 5,
    location: "B-03"
  },
  { 
    id: "4", 
    sku: "ONR-001", 
    title: "Forgotten Futures", 
    artist: "Les Amazones d'Afrique",
    supplier: "Outre-National Records",
    format: "LP",
    price: 24.00,
    stock: 45,
    threshold: 15,
    location: "C-01"
  },
  { 
    id: "5", 
    sku: "VLP-004", 
    title: "Saharan Rock", 
    artist: "Tinariwen",
    supplier: "Via Parigi",
    format: "LP",
    price: 26.00,
    stock: 8,
    threshold: 10,
    location: "A-22"
  },
];

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

export function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les produits</h2>
          <p className="text-sm text-muted-foreground">{products.length} références</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau produit
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          <select className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer">
            <option>Tous les fournisseurs</option>
            <option>Via Parigi</option>
            <option>Sublime Frequencies</option>
            <option>Mississippi Records</option>
            <option>Outre-National Records</option>
            <option>Numero Group</option>
          </select>
          <select className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer">
            <option>Tous les formats</option>
            <option>LP</option>
            <option>2LP</option>
            <option>CD</option>
            <option>7"</option>
            <option>Cassette</option>
          </select>
          <select className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer">
            <option>Tous les stocks</option>
            <option>En stock</option>
            <option>Stock faible</option>
            <option>Rupture</option>
          </select>
          <input 
            type="text" 
            placeholder="Rechercher produit, artiste..." 
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
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center">
                      <span className="text-[0.6rem] text-muted-foreground/50">VINYL</span>
                    </div>
                    <div>
                      <div className="font-semibold">{product.title}</div>
                      <div className="text-xs text-muted-foreground">{product.artist} · {product.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{product.supplier}</td>
                <td className="px-6 py-4 text-sm">{product.format}</td>
                <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(product.price)}</td>
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
      </div>
    </div>
  );
}
