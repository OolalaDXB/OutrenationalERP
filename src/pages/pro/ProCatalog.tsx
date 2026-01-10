import { useState, useMemo } from "react";
import { Search, Filter, ShoppingCart, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useGenres, useProductGenres } from "@/hooks/useGenres";
import { useProAuth } from "@/hooks/useProAuth";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/hooks/use-toast";

const FORMATS = [
  { value: "all", label: "Tous les formats" },
  { value: "lp", label: "LP" },
  { value: "2lp", label: "2LP" },
  { value: "cd", label: "CD" },
  { value: "7inch", label: '7"' },
  { value: "12inch", label: '12"' },
];

export function ProCatalog() {
  const { data: products = [], isLoading } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const { data: genres = [] } = useGenres();
  const { data: productGenres = [] } = useProductGenres();
  const { customer } = useProAuth();
  const { addItem, items } = useCart();

  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const discountRate = customer?.discount_rate || 0;

  // Create a map of product IDs to their genre IDs
  const productGenreMap = useMemo(() => {
    const map = new Map<string, string[]>();
    productGenres.forEach(pg => {
      const existing = map.get(pg.product_id) || [];
      existing.push(pg.genre_id);
      map.set(pg.product_id, existing);
    });
    return map;
  }, [productGenres]);

  // Filter products: in stock, published, matching filters
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Must have stock
      if ((product.stock ?? 0) <= 0) return false;
      
      // Must be published
      if (product.status !== 'published') return false;

      // Search
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          product.title.toLowerCase().includes(search) ||
          (product.artist_name?.toLowerCase().includes(search)) ||
          product.sku.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Format filter
      if (formatFilter !== "all" && product.format !== formatFilter) return false;

      // Supplier filter
      if (supplierFilter !== "all" && product.supplier_id !== supplierFilter) return false;

      // Genre filter
      if (genreFilter !== "all") {
        const productGenreIds = productGenreMap.get(product.id) || [];
        if (!productGenreIds.includes(genreFilter)) return false;
      }

      return true;
    });
  }, [products, searchTerm, formatFilter, supplierFilter, genreFilter, productGenreMap]);

  const getProPrice = (price: number) => {
    return price * (1 - discountRate / 100);
  };

  const handleAddToCart = (product: typeof products[0]) => {
    addItem(product);
    setAddedIds(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1500);
    toast({ title: "Ajouté au panier", description: product.title });
  };

  const isInCart = (productId: string) => items.some(item => item.product.id === productId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Catalogue</h1>
        <p className="text-muted-foreground">
          {filteredProducts.length} produit(s) disponible(s) • Remise pro: {discountRate}%
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map(format => (
              <SelectItem key={format.value} value={format.value}>
                {format.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Fournisseur" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les fournisseurs</SelectItem>
            {suppliers.map(supplier => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={genreFilter} onValueChange={setGenreFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les genres</SelectItem>
            {genres.map(genre => (
              <SelectItem key={genre.id} value={genre.id}>
                {genre.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Aucun produit trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              className="bg-card rounded-xl border border-border overflow-hidden hover:border-primary/50 transition-colors group"
            >
              {/* Image */}
              <div className="aspect-square bg-secondary relative overflow-hidden">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                    <span className="text-2xl text-muted-foreground/30">VINYL</span>
                  </div>
                )}
                {/* Stock badge */}
                <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-background/90 text-xs font-medium">
                  {product.stock} en stock
                </div>
              </div>

              {/* Info */}
              <div className="p-3 space-y-2">
                <div>
                  <p className="font-medium text-sm line-clamp-1">{product.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {product.artist_name || '—'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {product.format}
                  </span>
                </div>

                {/* Pricing */}
                <div className="space-y-0.5">
                  {discountRate > 0 && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatCurrency(product.selling_price)}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(getProPrice(product.selling_price))}
                  </p>
                </div>

                {/* Add to cart button */}
                <Button 
                  size="sm" 
                  className="w-full"
                  variant={isInCart(product.id) ? "secondary" : "default"}
                  onClick={() => handleAddToCart(product)}
                >
                  {addedIds.has(product.id) ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Ajouté
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      {isInCart(product.id) ? "Ajouter encore" : "Ajouter"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
