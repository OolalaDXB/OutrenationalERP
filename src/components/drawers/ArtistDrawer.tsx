import { X, Music, Disc, Euro, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { products, orders, formatCurrency } from "@/data/demo-data";
import { useMemo } from "react";

interface Artist {
  id: string;
  name: string;
  productsCount: number;
  totalRevenue: number;
  topFormat: string;
}

interface ArtistDrawerProps {
  artist: Artist | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatLabels: Record<string, string> = {
  lp: "LP",
  "2lp": "2×LP",
  cd: "CD",
  boxset: "Box Set",
  "7inch": '7"',
  cassette: "K7",
};

export function ArtistDrawer({ artist, isOpen, onClose }: ArtistDrawerProps) {
  if (!isOpen || !artist) return null;

  // Produits de l'artiste
  const artistProducts = useMemo(() => {
    return products.filter((p) => p.artist === artist.name);
  }, [artist.name]);

  // Ventes de l'artiste (extraites des commandes)
  const salesData = useMemo(() => {
    let totalSold = 0;
    let totalRevenue = 0;

    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.artist === artist.name) {
          totalSold += item.quantity;
          totalRevenue += item.unitPrice * item.quantity;
        }
      });
    });

    return { totalSold, totalRevenue };
  }, [artist.name]);

  // Stock total
  const totalStock = artistProducts.reduce((sum, p) => sum + p.stock, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-card shadow-lg animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{artist.name}</h2>
              <p className="text-sm text-muted-foreground">
                {artistProducts.length} référence{artistProducts.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                <Package className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold">{totalStock}</div>
              <div className="text-xs text-muted-foreground">En stock</div>
            </div>
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                <Disc className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold">{salesData.totalSold}</div>
              <div className="text-xs text-muted-foreground">Vendus</div>
            </div>
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
                <Euro className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold">{formatCurrency(salesData.totalRevenue)}</div>
              <div className="text-xs text-muted-foreground">CA</div>
            </div>
          </div>

          {/* Produits */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Disc className="w-4 h-4" />
              Discographie au catalogue
            </h3>
            <div className="space-y-3">
              {artistProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center flex-shrink-0">
                      <Disc className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{product.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-card rounded text-[0.65rem] font-medium">
                        {formatLabels[product.format] || product.format.toUpperCase()}
                      </span>
                      <span>{product.sku}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">{formatCurrency(product.sellingPrice)}</div>
                    <div className={`text-xs ${product.stock > product.threshold ? 'text-success' : product.stock > 0 ? 'text-warning' : 'text-danger'}`}>
                      {product.stock} en stock
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button className="flex-1">Voir tous les produits</Button>
            <Button variant="secondary" className="flex-1">Exporter</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
