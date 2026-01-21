import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, MoreHorizontal, Loader2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockIndicator } from "@/components/ui/stock-indicator";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { TablePagination, TableRowSkeleton } from "@/components/ui/table-pagination";
import { usePaginatedProducts, useProducts, useDeleteProduct, type Product } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useLabels } from "@/hooks/useLabels";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/format";
import { ProductFormModal } from "@/components/forms/ProductFormModal";
import { ProductDrawer } from "@/components/drawers/ProductDrawer";
import { ImportExportModal } from "@/components/import-export/ImportExportModal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const formatLabels: Record<string, string> = {
  lp: "LP",
  "2lp": "2×LP",
  "3lp": "3×LP",
  cd: "CD",
  boxset: "Box Set",
  "7inch": '7"',
  "10inch": '10"',
  "12inch": '12"',
  cassette: "K7",
  digital: "Digital",
};

const PAGE_SIZE = 50;

export function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canWrite, canDelete } = useAuth();
  
  // Get page from URL params
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  
  // Use paginated products for table display
  const { 
    data: paginatedData, 
    isLoading: productsLoading,
    isFetching: productsFetching,
    isPlaceholderData
  } = usePaginatedProducts({ page: currentPage, pageSize: PAGE_SIZE });
  
  // Use all products for filters and export (without soft-deleted)
  const { data: allProducts = [] } = useProducts();
  
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: labels = [], isLoading: labelsLoading } = useLabels();
  const deleteProduct = useDeleteProduct();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [showImportExport, setShowImportExport] = useState(false);

  // Initialize filters from URL params
  useEffect(() => {
    const labelParam = searchParams.get('label');
    const supplierParam = searchParams.get('supplier');
    if (labelParam) setLabelFilter(labelParam);
    if (supplierParam) setSupplierFilter(supplierParam);
  }, [searchParams]);

  // Update URL when filters change
  const updateFilter = (type: 'supplier' | 'label', value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete(type);
    } else {
      newParams.set(type, value);
    }
    // Reset to page 1 when filtering
    newParams.delete('page');
    setSearchParams(newParams);
    if (type === 'supplier') setSupplierFilter(value);
    if (type === 'label') setLabelFilter(value);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (newPage === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', newPage.toString());
    }
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when search/filters change
  useEffect(() => {
    if (currentPage > 1 && (searchTerm || formatFilter !== 'all' || stockFilter !== 'all')) {
      handlePageChange(1);
    }
  }, [searchTerm, formatFilter, stockFilter]);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Drawer state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isLoading = productsLoading || suppliersLoading || labelsLoading;

  // Formats uniques (from all products for filter dropdown)
  const formats = useMemo(() => {
    const unique = new Set(allProducts.map((p) => p.format));
    return Array.from(unique);
  }, [allProducts]);

  // Get products to display (from paginated data)
  const products = paginatedData?.data || [];
  const totalCount = paginatedData?.count || 0;

  // Client-side filtering on the current page's products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.artist_name && product.artist_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSupplier = supplierFilter === "all" || product.supplier_id === supplierFilter;
      const matchesLabel = labelFilter === "all" || product.label_id === labelFilter;
      const matchesFormat = formatFilter === "all" || product.format === formatFilter;

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

      return matchesSearch && matchesSupplier && matchesLabel && matchesFormat && matchesStock;
    });
  }, [products, searchTerm, supplierFilter, labelFilter, formatFilter, stockFilter]);

  const handleCreateNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Supprimer "${product.title}" ?`)) return;
    try {
      await deleteProduct.mutateAsync(product.id);
      toast({ title: "Succès", description: "Produit supprimé" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le produit", variant: "destructive" });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedProduct(null);
  };

  // CSV Export function (uses all filtered products from allProducts)
  const exportToCSV = useCallback(() => {
    // Filter all products for export
    const dataToExport = allProducts.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.artist_name && product.artist_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSupplier = supplierFilter === "all" || product.supplier_id === supplierFilter;
      const matchesLabel = labelFilter === "all" || product.label_id === labelFilter;
      const matchesFormat = formatFilter === "all" || product.format === formatFilter;
      const stock = product.stock ?? 0;
      const threshold = product.stock_threshold ?? 5;
      let matchesStock = true;
      if (stockFilter === "in_stock") matchesStock = stock > threshold;
      else if (stockFilter === "low") matchesStock = stock > 0 && stock <= threshold;
      else if (stockFilter === "out") matchesStock = stock === 0;
      return matchesSearch && matchesSupplier && matchesLabel && matchesFormat && matchesStock;
    });
    
    if (dataToExport.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucun produit à exporter", variant: "destructive" });
      return;
    }

    const headers = ["SKU", "Titre", "Artiste", "Fournisseur", "Label", "Format", "Prix", "Stock", "Emplacement"];
    const rows = dataToExport.map(product => [
      product.sku,
      `"${(product.title || '').replace(/"/g, '""')}"`,
      `"${(product.artist_name || '').replace(/"/g, '""')}"`,
      `"${(product.supplier_name || '').replace(/"/g, '""')}"`,
      `"${(product.label_name || '').replace(/"/g, '""')}"`,
      product.format || '',
      product.selling_price?.toString() || '',
      (product.stock ?? 0).toString(),
      `"${(product.location || '').replace(/"/g, '""')}"`
    ].join(";"));

    const csvContent = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `produits_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Export réussi", description: `${dataToExport.length} produit(s) exporté(s)` });
  }, [allProducts, searchTerm, supplierFilter, labelFilter, formatFilter, stockFilter, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const showLoadingState = productsFetching && isPlaceholderData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les produits</h2>
          <p className="text-sm text-muted-foreground">{totalCount} références</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportDropdowns
            onExportCSV={exportToCSV}
            onExportXLS={() => setShowImportExport(true)}
            onImportXLS={() => setShowImportExport(true)}
            canWrite={canWrite()}
            entityType="products"
          />
          {canWrite() && (
            <Button className="gap-2" onClick={handleCreateNew}>
              <Plus className="w-4 h-4" />
              Nouveau produit
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={supplierFilter}
            onChange={(e) => updateFilter('supplier', e.target.value)}
          >
            <option value="all">Tous les fournisseurs</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={labelFilter}
            onChange={(e) => updateFilter('label', e.target.value)}
          >
            <option value="all">Tous les labels</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
          >
            <option value="all">Tous les formats</option>
            {formats.map((f) => (
              <option key={f} value={f}>{formatLabels[f] || f?.toUpperCase()}</option>
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
        <div className={showLoadingState ? 'opacity-60' : ''}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Produit</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Fournisseur</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Label</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Format</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">État</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Prix</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Stock</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Emplacement</th>
                {canWrite() && (
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr 
                  key={product.id} 
                  className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(product)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
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
                        <div className="text-xs text-muted-foreground">{product.artist_name || '—'} · {product.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{product.supplier_name || '—'}</td>
                  <td className="px-6 py-4 text-sm">{product.label_name || '—'}</td>
                  <td className="px-6 py-4 text-sm">{formatLabels[product.format] || product.format.toUpperCase()}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary">
                      {product.condition_media || 'M'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(product.selling_price)}</td>
                  <td className="px-6 py-4">
                    <StockIndicator current={product.stock ?? 0} threshold={product.stock_threshold ?? 5} />
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{product.location || '—'}</td>
                  {canWrite() && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(product)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          {canDelete() && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(product)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && !showLoadingState && (
          <div className="p-12 text-center text-muted-foreground">
            Aucun produit trouvé
          </div>
        )}

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <TablePagination
            page={currentPage}
            pageSize={PAGE_SIZE}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            isLoading={productsFetching}
          />
        )}
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={editingProduct}
      />

      {/* Product Drawer */}
      <ProductDrawer
        product={selectedProduct}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />

      {/* Import/Export Modal */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        entityType="products"
        data={allProducts as unknown as Record<string, unknown>[]}
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
      />
    </div>
  );
}
