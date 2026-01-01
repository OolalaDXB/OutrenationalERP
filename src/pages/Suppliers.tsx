import { useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { SupplierDrawer } from "@/components/drawers/SupplierDrawer";
import { suppliers, Supplier, formatCurrency } from "@/data/demo-data";

export function SuppliersPage() {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleRowClick = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedSupplier(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les fournisseurs</h2>
          <p className="text-sm text-muted-foreground">{suppliers.length} fournisseurs actifs</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau fournisseur
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          <select className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer">
            <option>Tous les types</option>
            <option>Dépôt-vente</option>
            <option>Achat ferme</option>
            <option>Propre</option>
          </select>
          <select className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer">
            <option>Tous les pays</option>
            <option>France</option>
            <option>USA</option>
            <option>Italie</option>
          </select>
          <input 
            type="text" 
            placeholder="Rechercher fournisseur..." 
            className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>

        {/* Table */}
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Fournisseur</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Commission</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Références</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">CA Total</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">À reverser</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr 
                key={supplier.id} 
                className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(supplier)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                      {supplier.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-primary">{supplier.name}</div>
                      <div className="text-xs text-muted-foreground">{supplier.country}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge variant={supplierTypeVariant[supplier.type]}>
                    {supplierTypeLabel[supplier.type]}
                  </StatusBadge>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm tabular-nums">
                    {supplier.type === "consignment" ? `${(supplier.commissionRate * 100).toFixed(0)}%` : "—"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm tabular-nums">{supplier.products}</td>
                <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(supplier.revenue)}</td>
                <td className="px-6 py-4">
                  <span className={`tabular-nums ${supplier.pendingPayout > 0 ? "text-info font-semibold" : "text-muted-foreground"}`}>
                    {supplier.pendingPayout > 0 ? formatCurrency(supplier.pendingPayout) : "—"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Supplier Drawer */}
      <SupplierDrawer 
        supplier={selectedSupplier} 
        isOpen={isDrawerOpen} 
        onClose={handleCloseDrawer} 
      />
    </div>
  );
}
