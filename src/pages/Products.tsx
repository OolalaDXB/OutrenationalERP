import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, MoreHorizontal, Loader2, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockIndicator } from "@/components/ui/stock-indicator";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { TablePagination, TableRowSkeleton } from "@/components/ui/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  usePaginatedProducts, 
  useProducts, 
  useDeleteProduct, 
  useDeletedProducts,
  useRestoreProduct,
  usePermanentDeleteProduct,
  type Product 
} from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useLabels } from "@/hooks/useLabels";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/format";
import { ProductFormModal } from "@/components/forms/ProductFormModal";
import { ProductDrawer } from "@/components/drawers/ProductDrawer";
import { ImportExportModal } from "@/components/import-export/ImportExportModal";
import { useToast } from "@/hooks/use-toast";
import { validateBarcode } from "@/lib/barcode-validation";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  const { canWrite, canDelete, hasRole } = useAuth();
  
  // View mode: active products or trash
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  
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
  
  // Deleted products for trash view
  const { data: deletedProducts = [], isLoading: deletedLoading } = useDeletedProducts();
  
  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: labels = [], isLoading: labelsLoading } = useLabels();
  const deleteProduct = useDeleteProduct();
  const restoreProduct = useRestoreProduct();
  const permanentDeleteProduct = usePermanentDeleteProduct();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [barcodeFilter, setBarcodeFilter] = useState("all");
  const [showImportExport, setShowImportExport] = useState(false);
  
  // Confirmation dialogs state
  const [softDeleteDialog, setSoftDeleteDialog] = useState<Product | null>(null);
  const [restoreDialog, setRestoreDialog] = useState<Product | null>(null);
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<Product | null>(null);

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
    if (currentPage > 1 && (searchTerm || formatFilter !== 'all' || stockFilter !== 'all' || barcodeFilter !== 'all')) {
      handlePageChange(1);
    }
  }, [searchTerm, formatFilter, stockFilter, barcodeFilter]);
  
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

  // Client-side filtering on the current page's products (active view)
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.artist_name && product.artist_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));

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

      // Barcode filter
      let matchesBarcode = true;
      if (barcodeFilter === "with") {
        matchesBarcode = !!product.barcode && product.barcode.trim() !== "";
      } else if (barcodeFilter === "without") {
        matchesBarcode = !product.barcode || product.barcode.trim() === "";
      }

      return matchesSearch && matchesSupplier && matchesLabel && matchesFormat && matchesStock && matchesBarcode;
    });
  }, [products, searchTerm, supplierFilter, labelFilter, formatFilter, stockFilter, barcodeFilter]);

  // Client-side filtering on deleted products (trash view)
  const filteredDeletedProducts = useMemo(() => {
    return deletedProducts.filter((product) => {
      const matchesSearch =
        searchTerm === "" ||
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.artist_name && product.artist_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [deletedProducts, searchTerm]);

  const handleCreateNew = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSoftDelete = async () => {
    if (!softDeleteDialog) return;
    try {
      await deleteProduct.mutateAsync(softDeleteDialog.id);
      toast({ title: "Succès", description: "Produit archivé" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'archiver le produit", variant: "destructive" });
    } finally {
      setSoftDeleteDialog(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog) return;
    try {
      await restoreProduct.mutateAsync(restoreDialog.id);
      toast({ title: "Succès", description: "Produit restauré" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de restaurer le produit", variant: "destructive" });
    } finally {
      setRestoreDialog(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteDialog) return;
    try {
      await permanentDeleteProduct.mutateAsync(permanentDeleteDialog.id);
      toast({ title: "Succès", description: "Produit supprimé définitivement" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le produit", variant: "destructive" });
    } finally {
      setPermanentDeleteDialog(null);
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
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesSupplier = supplierFilter === "all" || product.supplier_id === supplierFilter;
      const matchesLabel = labelFilter === "all" || product.label_id === labelFilter;
      const matchesFormat = formatFilter === "all" || product.format === formatFilter;
      const stock = product.stock ?? 0;
      const threshold = product.stock_threshold ?? 5;
      let matchesStock = true;
      if (stockFilter === "in_stock") matchesStock = stock > threshold;
      else if (stockFilter === "low") matchesStock = stock > 0 && stock <= threshold;
      else if (stockFilter === "out") matchesStock = stock === 0;
      
      // Barcode filter
      let matchesBarcode = true;
      if (barcodeFilter === "with") {
        matchesBarcode = !!product.barcode && product.barcode.trim() !== "";
      } else if (barcodeFilter === "without") {
        matchesBarcode = !product.barcode || product.barcode.trim() === "";
      }
      
      return matchesSearch && matchesSupplier && matchesLabel && matchesFormat && matchesStock && matchesBarcode;
    });
    
    if (dataToExport.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucun produit à exporter", variant: "destructive" });
      return;
    }

    const headers = ["SKU", "Titre", "Artiste", "Code-barres", "Format code-barres", "Fournisseur", "Label", "Format", "Prix", "Stock", "Emplacement"];
    const rows = dataToExport.map(product => {
      // Determine barcode format
      let barcodeFormat = "";
      if (product.barcode && product.barcode.trim()) {
        if (product.barcode.startsWith('SILLON-') || product.barcode.startsWith('SIL-')) {
          barcodeFormat = "Interne";
        } else {
          const validation = validateBarcode(product.barcode);
          barcodeFormat = validation.isValid && validation.format ? validation.format : "Inconnu";
        }
      } else {
        barcodeFormat = "Aucun";
      }
      
      return [
        product.sku,
        `"${(product.title || '').replace(/"/g, '""')}"`,
        `"${(product.artist_name || '').replace(/"/g, '""')}"`,
        `"${(product.barcode || '').replace(/"/g, '""')}"`,
        barcodeFormat,
        `"${(product.supplier_name || '').replace(/"/g, '""')}"`,
        `"${(product.label_name || '').replace(/"/g, '""')}"`,
        product.format || '',
        product.selling_price?.toString() || '',
        (product.stock ?? 0).toString(),
        `"${(product.location || '').replace(/"/g, '""')}"`
      ].join(";");
    });

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
  }, [allProducts, searchTerm, supplierFilter, labelFilter, formatFilter, stockFilter, barcodeFilter, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const showLoadingState = productsFetching && isPlaceholderData;
  const trashCount = deletedProducts.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {viewMode === 'active' ? 'Tous les produits' : 'Corbeille'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'active' ? `${totalCount} références` : `${trashCount} produit(s) archivé(s)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === 'active' && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'active' | 'trash')}>
        <TabsList>
          <TabsTrigger value="active">Produits actifs</TabsTrigger>
          <TabsTrigger value="trash" className="gap-2">
            <Trash2 className="w-4 h-4" />
            Corbeille
            {trashCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {trashCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          {viewMode === 'active' && (
            <>
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
              <select
                className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
                value={barcodeFilter}
                onChange={(e) => setBarcodeFilter(e.target.value)}
              >
                <option value="all">Code-barres: Tous</option>
                <option value="with">Avec code-barres</option>
                <option value="without">Sans code-barres</option>
              </select>
            </>
          )}
          <input
            type="text"
            placeholder="Rechercher produit, artiste, SKU, code-barres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>

        {/* Active Products Table */}
        {viewMode === 'active' && (
          <>
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
                                  onClick={() => setSoftDeleteDialog(product)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Archiver
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
          </>
        )}

        {/* Trash View */}
        {viewMode === 'trash' && (
          <>
            {deletedLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Produit</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Format</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Prix</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Archivé le</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeletedProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="w-12 h-12 rounded-lg object-cover opacity-60"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-sidebar to-foreground flex items-center justify-center opacity-60">
                              <span className="text-[0.6rem] text-muted-foreground/50">VINYL</span>
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-muted-foreground">{product.title}</div>
                            <div className="text-xs text-muted-foreground">{product.artist_name || '—'} · {product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{formatLabels[product.format] || product.format.toUpperCase()}</td>
                      <td className="px-6 py-4 font-semibold tabular-nums text-muted-foreground">{formatCurrency(product.selling_price)}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {product.deleted_at && format(new Date(product.deleted_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoreDialog(product)}
                            className="gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restaurer
                          </Button>
                          {hasRole('admin') && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setPermanentDeleteDialog(product)}
                            >
                              Supprimer définitivement
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {filteredDeletedProducts.length === 0 && !deletedLoading && (
              <div className="p-12 text-center text-muted-foreground">
                La corbeille est vide
              </div>
            )}
          </>
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

      {/* Soft Delete Confirmation Dialog */}
      <AlertDialog open={!!softDeleteDialog} onOpenChange={() => setSoftDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir archiver "{softDeleteDialog?.title}" ? Le produit sera déplacé dans la corbeille et pourra être restauré ultérieurement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleSoftDelete}>Archiver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreDialog} onOpenChange={() => setRestoreDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurer "{restoreDialog?.title}" ? Le produit sera de nouveau disponible dans la liste des produits actifs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore}>Restaurer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!permanentDeleteDialog} onOpenChange={() => setPermanentDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">⚠️ Suppression définitive</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le produit "{permanentDeleteDialog?.title}" sera définitivement supprimé et ne pourra plus être récupéré.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
