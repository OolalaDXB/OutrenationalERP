import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ShoppingCart, Package, TrendingDown, Send, Check, Loader2, CheckSquare, Square } from "lucide-react";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import { StatusBadge, supplierTypeVariant, supplierTypeLabel } from "@/components/ui/status-badge";
import { MultiSupplierPOModal } from "@/components/reorder/MultiSupplierPOModal";
import { useLowStockProducts } from "@/hooks/useProducts";
import { useSuppliers, type Supplier } from "@/hooks/useSuppliers";
import { useCapability } from "@/hooks/useCapability";
import { formatCurrency } from "@/lib/format";

interface ReorderSuggestion {
  product: {
    id: string;
    title: string;
    artist_name: string | null;
    sku: string;
    stock: number;
    stock_threshold: number;
    purchase_price: number | null;
    supplier_id: string;
  };
  supplier: Supplier;
  deficit: number;
  suggestedQty: number;
  estimatedCost: number;
  priority: "critical" | "high" | "medium";
}

export function ReorderPage() {
  const navigate = useNavigate();
  const { data: lowStockProducts = [], isLoading: productsLoading, isError: productsError, error: productsErr, refetch: refetchProducts } = useLowStockProducts();
  const { data: suppliers = [], isLoading: suppliersLoading, isError: suppliersError, error: suppliersErr, refetch: refetchSuppliers } = useSuppliers();
  const { isEnabled, isLoading: capabilityLoading } = useCapability();
  
  const canCreatePO = isEnabled('purchase_orders');
  
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showMultiSupplierModal, setShowMultiSupplierModal] = useState(false);

  const isLoading = productsLoading || suppliersLoading;
  const isError = productsError || suppliersError;
  const errorMessage = productsErr instanceof Error ? productsErr.message : suppliersErr instanceof Error ? suppliersErr.message : "Erreur inconnue";

  // Générer les suggestions de réappro
  const suggestions = useMemo(() => {
    const result: ReorderSuggestion[] = [];

    lowStockProducts.forEach((product) => {
      if (!product.supplier_id || !product.id) return;
      
      const stock = product.stock ?? 0;
      const threshold = product.stock_threshold ?? 5;
      
      if (stock >= threshold) return;
      
      const supplier = suppliers.find((s) => s.id === product.supplier_id);
      if (!supplier) return;

      const deficit = threshold - stock;
      const suggestedQty = Math.max(deficit, threshold);
      const estimatedCost = product.purchase_price 
        ? product.purchase_price * suggestedQty 
        : 0;

      let priority: "critical" | "high" | "medium";
      if (stock === 0) {
        priority = "critical";
      } else if (stock <= threshold * 0.3) {
        priority = "high";
      } else {
        priority = "medium";
      }

      result.push({
        product: {
          id: product.id,
          title: product.title || '',
          artist_name: product.artist_name,
          sku: product.sku || '',
          stock,
          stock_threshold: threshold,
          purchase_price: product.purchase_price,
          supplier_id: product.supplier_id,
        },
        supplier,
        deficit,
        suggestedQty,
        estimatedCost,
        priority,
      });
    });

    return result.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [lowStockProducts, suppliers]);

  // Filtres
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      const matchesSearch = searchTerm === "" || 
        s.product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.product.artist_name && s.product.artist_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        s.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = priorityFilter === "all" || s.priority === priorityFilter;
      const matchesSupplier = supplierFilter === "all" || s.supplier.id === supplierFilter;

      return matchesSearch && matchesPriority && matchesSupplier;
    });
  }, [suggestions, searchTerm, priorityFilter, supplierFilter]);

  // Stats
  const criticalCount = suggestions.filter((s) => s.priority === "critical").length;
  const highCount = suggestions.filter((s) => s.priority === "high").length;
  const totalItems = suggestions.reduce((sum, s) => sum + s.suggestedQty, 0);
  const totalCost = suggestions.reduce((sum, s) => sum + s.estimatedCost, 0);

  // Grouper par fournisseur
  const groupedBySupplier = useMemo(() => {
    const groups = new Map<string, ReorderSuggestion[]>();
    filteredSuggestions.forEach((s) => {
      const existing = groups.get(s.supplier.id) || [];
      existing.push(s);
      groups.set(s.supplier.id, existing);
    });
    return groups;
  }, [filteredSuggestions]);

  const toggleSelection = (productId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedItems(newSelected);
  };

  // Select all / Deselect all (respects filters)
  const allFilteredSelected = filteredSuggestions.length > 0 && 
    filteredSuggestions.every((s) => selectedItems.has(s.product.id));

  const handleSelectAll = () => {
    const newSelected = new Set(selectedItems);
    filteredSuggestions.forEach((s) => newSelected.add(s.product.id));
    setSelectedItems(newSelected);
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredSuggestions.map((s) => s.product.id));
    const newSelected = new Set(
      Array.from(selectedItems).filter((id) => !filteredIds.has(id))
    );
    setSelectedItems(newSelected);
  };

  // Get selected suggestions for modal
  const selectedSuggestions = useMemo(() => {
    return suggestions.filter((s) => selectedItems.has(s.product.id));
  }, [suggestions, selectedItems]);

  // Count unique suppliers in selection
  const selectedSupplierCount = useMemo(() => {
    const supplierIds = new Set(selectedSuggestions.map((s) => s.supplier.id));
    return supplierIds.size;
  }, [selectedSuggestions]);

  // Handle "Commander" button click
  const handleCreatePO = () => {
    if (selectedSuggestions.length === 0) return;

    if (selectedSupplierCount > 1) {
      // Multiple suppliers - show modal
      setShowMultiSupplierModal(true);
    } else {
      // Single supplier - navigate to PO create with prefill
      const firstSupplier = selectedSuggestions[0]?.supplier;
      if (!firstSupplier) return;

      const prefill = {
        supplierId: firstSupplier.id,
        items: selectedSuggestions.map((s) => ({
          product_id: s.product.id,
          sku: s.product.sku,
          title: s.product.artist_name ? `${s.product.artist_name} - ${s.product.title}` : s.product.title,
          quantity_ordered: s.suggestedQty,
          unit_cost: s.product.purchase_price || 0,
        })),
      };

      try {
        sessionStorage.setItem('po-create-prefill', JSON.stringify(prefill));
      } catch {
        // Ignore storage errors
      }

      navigate('/purchase-orders/new');
    }
  };

  const handleMultiPOSuccess = () => {
    setShowMultiSupplierModal(false);
    setSelectedItems(new Set());
    navigate('/purchase-orders');
  };

  const priorityStyles = {
    critical: "bg-danger-light text-danger",
    high: "bg-warning-light text-warning-foreground",
    medium: "bg-info-light text-info",
  };

  const priorityLabels = {
    critical: "Rupture",
    high: "Urgent",
    medium: "À prévoir",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center">
        <p className="font-semibold text-danger">Impossible de charger les suggestions</p>
        <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
        <button
          onClick={() => { refetchProducts(); refetchSuppliers(); }}
          className="mt-4 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Multi-supplier PO Modal */}
      <MultiSupplierPOModal
        open={showMultiSupplierModal}
        onClose={() => setShowMultiSupplierModal(false)}
        selectedSuggestions={selectedSuggestions}
        onSuccess={handleMultiPOSuccess}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          icon={AlertTriangle}
          value={criticalCount.toString()}
          label="Ruptures de stock"
          variant="danger"
        />
        <KpiCard
          icon={TrendingDown}
          value={highCount.toString()}
          label="Stocks urgents"
          variant="warning"
        />
        <KpiCard
          icon={Package}
          value={totalItems.toString()}
          label="Unités à commander"
          variant="info"
        />
        <KpiCard
          icon={ShoppingCart}
          value={formatCurrency(totalCost)}
          label="Coût estimé"
          variant="primary"
        />
      </div>

      {/* Filters & Actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-3 flex-wrap">
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">Toutes priorités</option>
            <option value="critical">Ruptures</option>
            <option value="high">Urgents</option>
            <option value="medium">À prévoir</option>
          </select>
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
          >
            <option value="all">Tous les fournisseurs</option>
            {suppliers.filter(s => s.type !== "own").map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Rechercher produit, SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* Select All / Deselect All */}
          {filteredSuggestions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={allFilteredSelected ? handleDeselectAll : handleSelectAll}
              className="gap-2"
            >
              {allFilteredSelected ? (
                <>
                  <Square className="w-4 h-4" />
                  Tout désélectionner
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Tout sélectionner
                </>
              )}
            </Button>
          )}

          {selectedItems.size > 0 && (
            <Button 
              className="gap-2"
              disabled={!canCreatePO || capabilityLoading}
              title={!canCreatePO ? "Mise à niveau requise" : undefined}
              onClick={handleCreatePO}
            >
              <Send className="w-4 h-4" />
              Commander ({selectedItems.size} produits)
              {selectedSupplierCount > 1 && (
                <span className="text-xs opacity-80">
                  · {selectedSupplierCount} fournisseurs
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Suggestions groupées par fournisseur */}
      <div className="space-y-4">
        {Array.from(groupedBySupplier.entries()).map(([supplierId, items]) => {
          const supplier = suppliers.find((s) => s.id === supplierId)!;
          const groupTotal = items.reduce((sum, i) => sum + i.estimatedCost, 0);

          return (
            <div key={supplierId} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              {/* Supplier header */}
              <div className="flex items-center justify-between p-4 border-b border-border bg-secondary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                    {supplier.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-semibold">{supplier.name}</div>
                    <StatusBadge variant={supplierTypeVariant[supplier.type]}>
                      {supplierTypeLabel[supplier.type]}
                    </StatusBadge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{items.length} produits</div>
                  {supplier.type === "purchase" && (
                    <div className="font-semibold">{formatCurrency(groupTotal)}</div>
                  )}
                </div>
              </div>

              {/* Products table */}
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50 w-10">
                      <input
                        type="checkbox"
                        checked={items.every((i) => selectedItems.has(i.product.id))}
                        onChange={() => {
                          const allSelected = items.every((i) => selectedItems.has(i.product.id));
                          const newSelected = new Set(selectedItems);
                          items.forEach((i) => {
                            if (allSelected) {
                              newSelected.delete(i.product.id);
                            } else {
                              newSelected.add(i.product.id);
                            }
                          });
                          setSelectedItems(newSelected);
                        }}
                        className="rounded border-border"
                      />
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Produit</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Priorité</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Stock</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Seuil</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Qté suggérée</th>
                    {supplier.type === "purchase" && (
                      <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground bg-secondary/50">Coût</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.product.id}
                      className="border-t border-border/50 hover:bg-secondary/30 cursor-pointer"
                      onClick={() => toggleSelection(item.product.id)}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.product.id)}
                          onChange={() => toggleSelection(item.product.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-sm">{item.product.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.product.artist_name || '—'} · {item.product.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${priorityStyles[item.priority]}`}>
                          {priorityLabels[item.priority]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={item.product.stock === 0 ? "text-danger font-semibold" : ""}>
                          {item.product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {item.product.stock_threshold}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">
                        +{item.suggestedQty}
                      </td>
                      {supplier.type === "purchase" && (
                        <td className="px-4 py-3 text-right tabular-nums">
                          {item.estimatedCost > 0 ? formatCurrency(item.estimatedCost) : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {filteredSuggestions.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Check className="w-12 h-12 mx-auto mb-3 text-success" />
            <p className="text-lg font-semibold">Tous les stocks sont OK</p>
            <p className="text-sm text-muted-foreground">Aucune suggestion de réapprovisionnement</p>
          </div>
        )}
      </div>
    </div>
  );
}
