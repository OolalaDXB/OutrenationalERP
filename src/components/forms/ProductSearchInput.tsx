import { useState, useRef, useEffect, useMemo } from "react";
import { Search, Package, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  artist_name?: string | null;
  sku: string;
  selling_price: number;
  stock?: number | null;
  image_url?: string | null;
  format?: string | null;
}

interface ProductSearchInputProps {
  products: Product[];
  selectedProductId: string;
  onSelect: (product: Product) => void;
  placeholder?: string;
  className?: string;
}

export function ProductSearchInput({
  products,
  selectedProductId,
  onSelect,
  placeholder = "Rechercher un produit...",
  className,
}: ProductSearchInputProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get selected product for display
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 20);
    
    const searchLower = search.toLowerCase();
    return products
      .filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.artist_name?.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower)
      )
      .slice(0, 20);
  }, [products, search]);

  // Reset highlighted index when results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredProducts]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const items = listRef.current.querySelectorAll('[data-item]');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (product: Product) => {
    onSelect(product);
    setSearch("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProducts[highlightedIndex]) {
          handleSelect(filteredProducts[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch("");
        break;
    }
  };

  const handleClear = () => {
    setSearch("");
    onSelect({ id: "", title: "", sku: "", selling_price: 0 });
    inputRef.current?.focus();
  };

  // Show selected product or search input
  if (selectedProduct && !isOpen) {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer hover:bg-secondary/50 transition-colors",
          className
        )}
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        {selectedProduct.image_url ? (
          <img 
            src={selectedProduct.image_url} 
            alt="" 
            className="w-8 h-8 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
            <Package className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{selectedProduct.title}</div>
          {selectedProduct.artist_name && (
            <div className="text-xs text-muted-foreground truncate">
              {selectedProduct.artist_name}
            </div>
          )}
        </div>
        <span className="text-muted-foreground text-xs flex-shrink-0">
          {formatCurrency(selectedProduct.selling_price)}
        </span>
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
          className="p-1 hover:bg-muted rounded"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay to allow click on items
            setTimeout(() => setIsOpen(false), 150);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={listRef}
          className="absolute z-50 top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto bg-popover border border-border rounded-md shadow-lg"
        >
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun produit trouvé
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <div
                key={product.id}
                data-item
                className={cn(
                  "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                  index === highlightedIndex ? "bg-accent" : "hover:bg-secondary/50"
                )}
                onClick={() => handleSelect(product)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt="" 
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{product.title}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {product.artist_name && (
                      <span className="truncate">{product.artist_name}</span>
                    )}
                    <span className="opacity-50">•</span>
                    <span>{product.sku}</span>
                    {product.format && (
                      <>
                        <span className="opacity-50">•</span>
                        <span className="uppercase">{product.format}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-medium text-sm">{formatCurrency(product.selling_price)}</div>
                  {product.stock !== null && product.stock !== undefined && (
                    <div className={cn(
                      "text-xs",
                      product.stock > 0 ? "text-green-600" : "text-destructive"
                    )}>
                      {product.stock > 0 ? `${product.stock} en stock` : "Rupture"}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
