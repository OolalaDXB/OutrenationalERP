import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Loader2, Building2, MoreHorizontal, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerFormModal } from "@/components/forms/CustomerFormModal";
import { CustomerDrawer } from "@/components/drawers/CustomerDrawer";
import { ImportExportModal } from "@/components/import-export/ImportExportModal";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { TablePagination } from "@/components/ui/table-pagination";
import { 
  usePaginatedCustomers, 
  useCustomers, 
  useDeleteCustomer, 
  useDeletedCustomers,
  useRestoreCustomer,
  usePermanentDeleteCustomer,
  type Customer 
} from "@/hooks/useCustomers";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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

const PAGE_SIZE = 50;

export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canWrite, canDelete, hasRole } = useAuth();
  
  // View mode
  const [viewMode, setViewMode] = useState<'active' | 'trash'>('active');
  
  // Get page from URL params
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  
  // Use paginated customers for table display
  const { 
    data: paginatedData, 
    isLoading,
    isFetching,
    isPlaceholderData,
    error 
  } = usePaginatedCustomers({ page: currentPage, pageSize: PAGE_SIZE });
  
  // Use all customers for filters and export
  const { data: allCustomers = [] } = useCustomers();
  
  // Deleted customers
  const { data: deletedCustomers = [], isLoading: deletedLoading } = useDeletedCustomers();
  
  const deleteCustomer = useDeleteCustomer();
  const restoreCustomer = useRestoreCustomer();
  const permanentDeleteCustomer = usePermanentDeleteCustomer();
  
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Confirmation dialogs
  const [softDeleteDialog, setSoftDeleteDialog] = useState<Customer | null>(null);
  const [restoreDialog, setRestoreDialog] = useState<Customer | null>(null);
  const [permanentDeleteDialog, setPermanentDeleteDialog] = useState<Customer | null>(null);

  // Get customers to display (from paginated data)
  const customers = paginatedData?.data || [];
  const totalCount = paginatedData?.count || 0;

  // Pays uniques (from all customers for filter dropdown)
  const countries = useMemo(() => {
    const unique = new Set(allCustomers.map((c) => c.country).filter(Boolean));
    return Array.from(unique).sort() as string[];
  }, [allCustomers]);

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

  // Filtrage on current page's customers
  const filteredCustomers = useMemo(() => {
    const filtered = customers.filter((customer) => {
      if (!customer) return false;
      const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
      const companyName = (customer.company_name || '').toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        fullName.includes(searchTerm.toLowerCase()) ||
        companyName.includes(searchTerm.toLowerCase()) ||
        (customer.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (customer.city && customer.city.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCountry = countryFilter === "all" || customer.country === countryFilter;
      const isPro = customer.customer_type === 'professional' || customer.customer_type === 'professionnel';
      const matchesType = typeFilter === "all" || 
        customer.customer_type === typeFilter ||
        (typeFilter === 'professional' && customer.customer_type === 'professionnel') ||
        (typeFilter === 'professionnel' && customer.customer_type === 'professional');
      
      // Approval filter for professional customers
      let matchesApproval = true;
      if (approvalFilter === "pending") {
        matchesApproval = isPro && customer.approved === false;
      } else if (approvalFilter === "approved") {
        matchesApproval = isPro && customer.approved === true;
      }

      return matchesSearch && matchesCountry && matchesType && matchesApproval;
    });
    
    // Sort: Pro customers first, then by created_at desc
    return filtered.sort((a, b) => {
      const aIsPro = a.customer_type === 'professional' || a.customer_type === 'professionnel';
      const bIsPro = b.customer_type === 'professional' || b.customer_type === 'professionnel';
      
      if (aIsPro && !bIsPro) return -1;
      if (!aIsPro && bIsPro) return 1;
      
      // Within same type, sort by pending approval first for pro
      if (aIsPro && bIsPro) {
        const aIsPending = a.approved === false;
        const bIsPending = b.approved === false;
        if (aIsPending && !bIsPending) return -1;
        if (!aIsPending && bIsPending) return 1;
      }
      
      return 0;
    });
  }, [customers, searchTerm, countryFilter, typeFilter, approvalFilter]);

  // Filter deleted customers
  const filteredDeletedCustomers = useMemo(() => {
    return deletedCustomers.filter((customer) => {
      if (!customer) return false;
      const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
      const companyName = (customer.company_name || '').toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        fullName.includes(searchTerm.toLowerCase()) ||
        companyName.includes(searchTerm.toLowerCase()) ||
        (customer.email?.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [deletedCustomers, searchTerm]);

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCustomer(null);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCustomer(null);
  };

  const handleSoftDelete = async () => {
    if (!softDeleteDialog) return;
    try {
      await deleteCustomer.mutateAsync(softDeleteDialog.id);
      toast({ title: "Succès", description: "Client archivé" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'archiver le client", variant: "destructive" });
    } finally {
      setSoftDeleteDialog(null);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog) return;
    try {
      await restoreCustomer.mutateAsync(restoreDialog.id);
      toast({ title: "Succès", description: "Client restauré" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de restaurer le client", variant: "destructive" });
    } finally {
      setRestoreDialog(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeleteDialog) return;
    try {
      await permanentDeleteCustomer.mutateAsync(permanentDeleteDialog.id);
      toast({ title: "Succès", description: "Client supprimé définitivement" });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le client", variant: "destructive" });
    } finally {
      setPermanentDeleteDialog(null);
    }
  };

  // CSV Export function (uses all filtered customers)
  const exportToCSV = useCallback(() => {
    // Filter all customers for export
    const dataToExport = allCustomers.filter((customer) => {
      const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
      const companyName = (customer.company_name || '').toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        fullName.includes(searchTerm.toLowerCase()) ||
        companyName.includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.city && customer.city.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCountry = countryFilter === "all" || customer.country === countryFilter;
      const isPro = customer.customer_type === 'professional' || customer.customer_type === 'professionnel';
      const matchesType = typeFilter === "all" || 
        customer.customer_type === typeFilter ||
        (typeFilter === 'professional' && customer.customer_type === 'professionnel') ||
        (typeFilter === 'professionnel' && customer.customer_type === 'professional');
      
      let matchesApproval = true;
      if (approvalFilter === "pending") {
        matchesApproval = isPro && customer.approved === false;
      } else if (approvalFilter === "approved") {
        matchesApproval = isPro && customer.approved === true;
      }
      
      return matchesSearch && matchesCountry && matchesType && matchesApproval;
    });
    
    if (dataToExport.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucun client à exporter", variant: "destructive" });
      return;
    }

    const headers = ["Prénom", "Nom", "Email", "Entreprise", "Type", "Ville", "Pays", "Commandes", "CA Total"];
    const rows = dataToExport.map(customer => [
      `"${(customer.first_name || '').replace(/"/g, '""')}"`,
      `"${(customer.last_name || '').replace(/"/g, '""')}"`,
      customer.email,
      `"${(customer.company_name || '').replace(/"/g, '""')}"`,
      customer.customer_type || '',
      `"${(customer.city || '').replace(/"/g, '""')}"`,
      customer.country || '',
      (customer.orders_count || 0).toString(),
      (customer.total_spent || 0).toString()
    ].join(";"));

    const csvContent = [headers.join(";"), ...rows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Export réussi", description: `${dataToExport.length} client(s) exporté(s)` });
  }, [allCustomers, searchTerm, countryFilter, typeFilter, approvalFilter, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center text-destructive">
        Erreur lors du chargement des clients
      </div>
    );
  }

  const showLoadingState = isFetching && isPlaceholderData;
  const trashCount = deletedCustomers.length;

  const getCustomerDisplayName = (customer: Customer | null | undefined) => {
    if (!customer) return '—';
    if (customer.customer_type === 'professionnel' && customer.company_name) {
      return customer.company_name;
    }
    return `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email || '—';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {viewMode === 'active' ? 'Tous les clients' : 'Corbeille'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'active' ? `${totalCount} clients` : `${trashCount} client(s) archivé(s)`}
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
                entityType="customers"
              />
              {canWrite() && (
                <Button className="gap-2" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4" />
                  Nouveau client
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'active' | 'trash')}>
        <TabsList>
          <TabsTrigger value="active">Clients actifs</TabsTrigger>
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
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          {viewMode === 'active' && (
            <>
              <select
                className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">Tous les types</option>
                <option value="particulier">Particuliers</option>
                <option value="professional">Professionnels</option>
                <option value="professionnel">Professionnels (legacy)</option>
              </select>
              <select
                className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
              >
                <option value="all">Tous statuts</option>
                <option value="pending">⏳ En attente d'approbation</option>
                <option value="approved">✅ Approuvés</option>
              </select>
              <select
                className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="all">Tous les pays</option>
                {countries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </>
          )}
          <input
            type="text"
            placeholder="Rechercher client, entreprise, email, ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>

        {/* Active Customers Table */}
        {viewMode === 'active' && (
          <div className={showLoadingState ? 'opacity-60' : ''}>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Nom / Entreprise</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border hidden lg:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border hidden md:table-cell">Localisation</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border hidden sm:table-cell">Commandes</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border hidden sm:table-cell">CA Total</th>
                  {canWrite() && (
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const isPro = customer.customer_type === 'professional' || customer.customer_type === 'professionnel';
                  const isPendingApproval = isPro && customer.approved === false;
                  const isApproved = isPro && customer.approved === true;
                  
                  return (
                    <tr
                      key={customer.id}
                      className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => handleRowClick(customer)}
                    >
                      {/* Type Badge */}
                      <td className="px-4 py-4">
                        {isPro ? (
                          <Badge variant="default" className="bg-primary/90 text-primary-foreground">
                            PRO
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Particulier
                          </Badge>
                        )}
                      </td>
                      
                      {/* Name / Company */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                            isPro 
                              ? 'bg-primary/10 text-primary' 
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {isPro ? (
                              <Building2 className="w-5 h-5" />
                            ) : (
                              <>{(customer.first_name?.[0] || '?')}{(customer.last_name?.[0] || '')}</>
                            )}
                          </div>
                          <div className="min-w-0">
                            {isPro && customer.company_name ? (
                              <>
                                <div className="font-semibold truncate">{customer.company_name}</div>
                                <div className="text-xs text-muted-foreground truncate">{customer.email}</div>
                              </>
                            ) : (
                              <>
                                <div className="font-semibold truncate">
                                  {`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '—'}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">{customer.email}</div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      
                      {/* Contact (for Pro customers) */}
                      <td className="px-4 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                        {isPro ? (
                          <span>{`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '—'}</span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                      
                      {/* Location */}
                      <td className="px-4 py-4 text-sm text-muted-foreground hidden md:table-cell">
                        {customer.city ? `${customer.city}, ${customer.country || ''}` : customer.country || '—'}
                      </td>
                      
                      {/* Approval Status */}
                      <td className="px-4 py-4">
                        {isPro ? (
                          isPendingApproval ? (
                            <Badge variant="outline" className="border-warning text-warning bg-warning/10">
                              En attente
                            </Badge>
                          ) : isApproved ? (
                            <Badge variant="outline" className="border-success text-success bg-success/10">
                              Approuvé
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      
                      {/* Orders count */}
                      <td className="px-4 py-4 text-sm tabular-nums hidden sm:table-cell">{customer.orders_count || 0}</td>
                      
                      {/* Total spent */}
                      <td className="px-4 py-4 font-semibold tabular-nums hidden sm:table-cell">{formatCurrency(customer.total_spent)}</td>
                      
                      {/* Actions */}
                      {canWrite() && (
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              {canDelete() && (
                                <DropdownMenuItem 
                                  onClick={() => setSoftDeleteDialog(customer)}
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
                  );
                })}
              </tbody>
            </table>

            {filteredCustomers.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                Aucun client trouvé
              </div>
            )}

            {/* Pagination */}
            <TablePagination
              page={currentPage}
              totalCount={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={handlePageChange}
              isLoading={showLoadingState}
            />
          </div>
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
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Client</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Email</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Archivé le</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeletedCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary opacity-60">
                            {customer.customer_type === 'professionnel' ? (
                              <Building2 className="w-5 h-5" />
                            ) : (
                              <>{(customer.first_name?.[0] || '?')}{(customer.last_name?.[0] || '')}</>
                            )}
                          </div>
                          <div className="text-muted-foreground">
                            {getCustomerDisplayName(customer)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{customer.email}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {customer.deleted_at && format(new Date(customer.deleted_at), "d MMM yyyy à HH:mm", { locale: fr })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRestoreDialog(customer)}
                            className="gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restaurer
                          </Button>
                          {hasRole('admin') && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setPermanentDeleteDialog(customer)}
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

            {filteredDeletedCustomers.length === 0 && !deletedLoading && (
              <div className="p-12 text-center text-muted-foreground">
                La corbeille est vide
              </div>
            )}
          </>
        )}
      </div>

      <CustomerFormModal
        isOpen={showForm}
        onClose={handleCloseForm}
        customer={editingCustomer}
      />
      <CustomerDrawer
        customer={selectedCustomer}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
        entityType="customers"
        data={allCustomers as unknown as Record<string, unknown>[]}
        onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}
      />

      {/* Soft Delete Confirmation Dialog */}
      <AlertDialog open={!!softDeleteDialog} onOpenChange={() => setSoftDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir archiver "{getCustomerDisplayName(softDeleteDialog!)}" ? Le client sera déplacé dans la corbeille et pourra être restauré ultérieurement.
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
            <AlertDialogTitle>Restaurer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurer "{getCustomerDisplayName(restoreDialog!)}" ? Le client sera de nouveau disponible dans la liste des clients actifs.
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
              Cette action est irréversible. Le client "{getCustomerDisplayName(permanentDeleteDialog!)}" sera définitivement supprimé et ne pourra plus être récupéré.
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
