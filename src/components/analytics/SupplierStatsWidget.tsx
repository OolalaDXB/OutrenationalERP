import { useMemo } from "react";
import { Building2, TrendingUp, ShoppingCart, Percent, Euro } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import type { Supplier } from "@/hooks/useSuppliers";

interface SupplierStatsWidgetProps {
  products: Product[];
  suppliers: Supplier[];
  orders: any[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function SupplierStatsWidget({ products, suppliers, orders }: SupplierStatsWidgetProps) {
  const supplierStats = useMemo(() => {
    const stats = new Map<string, {
      supplierId: string;
      supplierName: string;
      supplierType: string;
      productCount: number;
      totalStock: number;
      stockValue: number;
      totalSold: number;
      totalRevenue: number;
      totalCost: number;
      margin: number;
      marginPercent: number;
    }>();

    // Initialize from suppliers
    suppliers.forEach(supplier => {
      stats.set(supplier.id, {
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierType: supplier.type,
        productCount: 0,
        totalStock: 0,
        stockValue: 0,
        totalSold: 0,
        totalRevenue: 0,
        totalCost: 0,
        margin: 0,
        marginPercent: 0,
      });
    });

    // Calculate from products
    products.forEach(product => {
      const stat = stats.get(product.supplier_id);
      if (!stat) return;

      const p = product as any;
      const stock = product.stock || 0;
      const purchasePrice = product.purchase_price || 0;
      const exchangeRate = p.exchange_rate || 1;
      const currency = p.currency || "EUR";
      const marketplaceFees = p.marketplace_fees || 0;
      const importFees = p.import_fees || 0;
      const shippingCost = p.shipping_cost || 0;

      const purchaseInEur = currency === "USD" ? purchasePrice * exchangeRate : purchasePrice;
      const unitCost = purchaseInEur + marketplaceFees + importFees + shippingCost;

      stat.productCount += 1;
      stat.totalStock += stock;
      stat.stockValue += product.selling_price * stock;
      stat.totalSold += product.total_sold || 0;
      stat.totalRevenue += product.total_revenue || 0;
      stat.totalCost += unitCost * (product.total_sold || 0);
    });

    // Calculate margins
    stats.forEach(stat => {
      stat.margin = stat.totalRevenue - stat.totalCost;
      stat.marginPercent = stat.totalRevenue > 0 ? (stat.margin / stat.totalRevenue) * 100 : 0;
    });

    return Array.from(stats.values())
      .filter(s => s.productCount > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [products, suppliers]);

  const topSuppliers = supplierStats.slice(0, 10);

  const totals = useMemo(() => {
    return supplierStats.reduce((acc, s) => ({
      totalRevenue: acc.totalRevenue + s.totalRevenue,
      totalMargin: acc.totalMargin + s.margin,
      totalSold: acc.totalSold + s.totalSold,
    }), { totalRevenue: 0, totalMargin: 0, totalSold: 0 });
  }, [supplierStats]);

  const supplierTypeLabels: Record<string, string> = {
    consignment: "Dépôt",
    purchase: "Achat",
    own: "Propre",
    depot_vente: "Dépôt-vente",
  };

  if (topSuppliers.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Performance par fournisseur
        </h3>
        <div className="py-8 text-center text-muted-foreground">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        Performance par fournisseur
      </h3>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-secondary/30 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <Euro className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold">{formatCurrency(totals.totalRevenue)}</div>
          <div className="text-xs text-muted-foreground">CA Total</div>
        </div>
        <div className="p-4 bg-secondary/30 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className={`text-xl font-bold ${totals.totalMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totals.totalMargin)}
          </div>
          <div className="text-xs text-muted-foreground">Marge Totale</div>
        </div>
        <div className="p-4 bg-secondary/30 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold">{totals.totalSold}</div>
          <div className="text-xs text-muted-foreground">Articles vendus</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
              <th className="text-left py-3 px-2 font-medium text-muted-foreground">Fournisseur</th>
              <th className="text-center py-3 px-2 font-medium text-muted-foreground">Type</th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">Produits</th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">Vendus</th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">CA</th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">Marge €</th>
              <th className="text-right py-3 px-2 font-medium text-muted-foreground">Marge %</th>
            </tr>
          </thead>
          <tbody>
            {topSuppliers.map((stat, index) => (
              <tr key={stat.supplierId} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="py-3 px-2 text-muted-foreground">{index + 1}</td>
                <td className="py-3 px-2">
                  <div className="font-medium">{stat.supplierName}</div>
                </td>
                <td className="py-3 px-2 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary">
                    {supplierTypeLabels[stat.supplierType] || stat.supplierType}
                  </span>
                </td>
                <td className="py-3 px-2 text-right">{stat.productCount}</td>
                <td className="py-3 px-2 text-right">{stat.totalSold}</td>
                <td className="py-3 px-2 text-right font-medium">{formatCurrency(stat.totalRevenue)}</td>
                <td className={`py-3 px-2 text-right font-medium ${stat.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(stat.margin)}
                </td>
                <td className={`py-3 px-2 text-right ${stat.marginPercent >= 20 ? "text-green-600" : stat.marginPercent >= 0 ? "text-amber-600" : "text-red-600"}`}>
                  {stat.marginPercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {supplierStats.length > 10 && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Affichage des 10 premiers fournisseurs sur {supplierStats.length}
        </p>
      )}
    </div>
  );
}
