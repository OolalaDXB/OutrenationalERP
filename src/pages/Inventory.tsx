import { Warehouse, Package, AlertTriangle, XCircle } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { StockIndicator } from "@/components/ui/stock-indicator";

// Demo data
const inventory = [
  { id: "1", sku: "VLP-001", title: "Khmer Rouge Survivors", artist: "Various Artists", stock: 12, threshold: 10, location: "A-12" },
  { id: "2", sku: "VLP-002", title: "Synthesizer Meditation", artist: "Mort Garson", stock: 5, threshold: 10, location: "A-15" },
  { id: "3", sku: "VLP-003", title: "Music From the Morning of the World", artist: "Various Artists", stock: 0, threshold: 5, location: "B-03" },
  { id: "4", sku: "ONR-001", title: "Forgotten Futures", artist: "Les Amazones d'Afrique", stock: 45, threshold: 15, location: "C-01" },
  { id: "5", sku: "VLP-004", title: "Saharan Rock", artist: "Tinariwen", stock: 8, threshold: 10, location: "A-22" },
  { id: "6", sku: "VLP-005", title: "Ethiopiques Vol. 4", artist: "Various Artists", stock: 3, threshold: 8, location: "B-08" },
  { id: "7", sku: "ONR-002", title: "Cosmic Afro", artist: "Mulatu Astatke", stock: 0, threshold: 10, location: "C-05" },
];

const totalUnits = inventory.reduce((sum, item) => sum + item.stock, 0);
const lowStockCount = inventory.filter(item => item.stock > 0 && item.stock <= item.threshold).length;
const outOfStockCount = inventory.filter(item => item.stock === 0).length;

export function InventoryPage() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard icon={Warehouse} value={totalUnits.toString()} label="Unités en stock" variant="primary" />
        <KpiCard icon={Package} value={inventory.length.toString()} label="Références" variant="info" />
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
            <select className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer">
              <option>Tous les états</option>
              <option>En stock</option>
              <option>Stock faible</option>
              <option>Rupture</option>
            </select>
            <input 
              type="text" 
              placeholder="Rechercher produit, SKU..." 
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
              {inventory.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.artist}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{item.sku}</td>
                  <td className="px-6 py-4">
                    <StockIndicator current={item.stock} threshold={item.threshold} />
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{item.threshold}</td>
                  <td className="px-6 py-4 text-sm font-mono">{item.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
