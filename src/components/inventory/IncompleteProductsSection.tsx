import { useState, useMemo } from "react";
import { 
  AlertTriangle, 
  Tag, 
  Building2, 
  Barcode, 
  Hash,
  ChevronDown,
  ChevronUp,
  Package,
  Pencil,
  Filter,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIncompleteProducts } from "@/hooks/useIncompleteProducts";
import { useProducts } from "@/hooks/useProducts";
import { ProductFormModal } from "@/components/forms/ProductFormModal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const missingFieldLabels: Record<string, { label: string; icon: React.ElementType; color: string; activeColor: string }> = {
  label: { label: "Label", icon: Tag, color: "bg-purple-100 text-purple-700", activeColor: "bg-purple-500 text-white" },
  supplier: { label: "Fournisseur", icon: Building2, color: "bg-blue-100 text-blue-700", activeColor: "bg-blue-500 text-white" },
  barcode: { label: "Code-barres", icon: Barcode, color: "bg-amber-100 text-amber-700", activeColor: "bg-amber-500 text-white" },
  sku: { label: "SKU", icon: Hash, color: "bg-red-100 text-red-700", activeColor: "bg-red-500 text-white" },
};

export function IncompleteProductsSection() {
  const { data: incompleteProducts, isLoading } = useIncompleteProducts();
  const { data: allProducts } = useProducts();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // Filter products based on active filters
  const filteredProducts = useMemo(() => {
    if (!incompleteProducts) return [];
    if (activeFilters.length === 0) return incompleteProducts;
    
    return incompleteProducts.filter(product =>
      activeFilters.some(filter => product.missing_fields.includes(filter))
    );
  }, [incompleteProducts, activeFilters]);
  
  const displayedProducts = isExpanded ? filteredProducts : filteredProducts?.slice(0, 5);
  
  // Get full product for editing
  const editingProduct = editingProductId 
    ? allProducts?.find(p => p.id === editingProductId) 
    : null;
  
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary"></div>
          <div className="flex-1">
            <div className="h-4 bg-secondary rounded w-48 mb-2"></div>
            <div className="h-3 bg-secondary rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!incompleteProducts || incompleteProducts.length === 0) {
    return null;
  }
  
  return (
    <>
      <div className="bg-card rounded-xl border border-amber-200 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold">Produits incomplets</h3>
              <p className="text-sm text-muted-foreground">
                {incompleteProducts.length} produit{incompleteProducts.length > 1 ? 's' : ''} avec des informations manquantes
              </p>
            </div>
          </div>
          
        </div>
        
        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mr-2">
            <Filter className="w-4 h-4" />
            <span>Filtrer :</span>
          </div>
          
          {Object.entries(
            incompleteProducts.reduce((acc, p) => {
              p.missing_fields.forEach(f => {
                acc[f] = (acc[f] || 0) + 1;
              });
              return acc;
            }, {} as Record<string, number>)
          ).map(([field, count]) => {
            const config = missingFieldLabels[field];
            if (!config) return null;
            const Icon = config.icon;
            const isActive = activeFilters.includes(field);
            
            return (
              <button
                key={field}
                onClick={() => {
                  setActiveFilters(prev =>
                    prev.includes(field)
                      ? prev.filter(f => f !== field)
                      : [...prev, field]
                  );
                }}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
                  transition-all duration-200 border
                  ${isActive 
                    ? `${config.activeColor} border-transparent shadow-sm` 
                    : `${config.color} border-transparent hover:border-current/20`
                  }
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {config.label}
                <span className={`
                  ml-0.5 px-1.5 py-0.5 rounded-full text-xs
                  ${isActive ? 'bg-white/20' : 'bg-black/10'}
                `}>
                  {count}
                </span>
              </button>
            );
          })}
          
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilters([])}
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Effacer
            </Button>
          )}
        </div>
        
        {/* Results count when filtered */}
        {activeFilters.length > 0 && (
          <p className="text-sm text-muted-foreground mb-3">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''}
          </p>
        )}
        
        {/* Products list */}
        <div className="space-y-2">
          {displayedProducts?.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
              onClick={() => {
                setEditingProductId(product.id);
                // Focus barcode field if barcode is missing
                setFocusField(product.missing_fields.includes('barcode') ? 'barcode' : null);
              }}
            >
              {/* Image */}
              <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {product.image_url ? (
                  <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground/50" />
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{product.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {product.artist_name || 'Artiste inconnu'} • SKU: {product.sku || '—'}
                </p>
              </div>
              
              {/* Missing fields badges */}
              <div className="flex gap-1.5">
                {product.missing_fields.map((field) => {
                  const config = missingFieldLabels[field];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <div
                      key={field}
                      className={`p-1.5 rounded-md ${config.color}`}
                      title={`${config.label} manquant`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  );
                })}
              </div>
              
              {/* Action */}
              <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
        
        {/* Expand/Collapse button */}
        {filteredProducts.length > 5 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Voir moins
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Voir les {filteredProducts.length - 5} autres
              </>
            )}
          </Button>
        )}
      </div>
      
      {/* Product Edit Modal */}
      {editingProduct && (
        <ProductFormModal
          isOpen={!!editingProductId}
          onClose={() => {
            setEditingProductId(null);
            setFocusField(null);
          }}
          product={editingProduct}
          focusField={focusField}
        />
      )}
    </>
  );
}
