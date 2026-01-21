import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Loader2, Building2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerFormModal } from "@/components/forms/CustomerFormModal";
import { CustomerDrawer } from "@/components/drawers/CustomerDrawer";
import { ImportExportModal } from "@/components/import-export/ImportExportModal";
import { ImportExportDropdowns } from "@/components/ui/import-export-dropdowns";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePaginatedCustomers, useCustomers, useDeleteCustomer, type Customer } from "@/hooks/useCustomers";
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

const PAGE_SIZE = 50;

export function CustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { canWrite, canDelete } = useAuth();
  
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
  
  const deleteCustomer = useDeleteCustomer();
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

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
    return customers.filter((customer) => {
      const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
      const companyName = (customer.company_name || '').toLowerCase();
      const matchesSearch =
        searchTerm === "" ||
        fullName.includes(searchTerm.toLowerCase()) ||
        companyName.includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.city && customer.city.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCountry = countryFilter === "all" || customer.country === countryFilter;
      const matchesType = typeFilter === "all" || customer.customer_type === typeFilter;

      return matchesSearch && matchesCountry && matchesType;
    });
  }, [customers, searchTerm, countryFilter, typeFilter]);

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

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await deleteCustomer.mutateAsync(deletingCustomer.id);
      toast({ title: "Succès", description: "Client supprimé" });
      setDeletingCustomer(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le client", variant: "destructive" });
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
      const matchesType = typeFilter === "all" || customer.customer_type === typeFilter;
      return matchesSearch && matchesCountry && matchesType;
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
  }, [allCustomers, searchTerm, countryFilter, typeFilter, toast]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les clients</h2>
          <p className="text-sm text-muted-foreground">{totalCount} clients</p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
          <select
            className="px-3 py-2 rounded-md border border-border bg-card text-sm cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Tous les types</option>
            <option value="particulier">Particuliers</option>
            <option value="professionnel">Professionnels</option>
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
          <input
            type="text"
            placeholder="Rechercher client, entreprise, email, ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>

        <div className={showLoadingState ? 'opacity-60' : ''}>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Client</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Localisation</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Commandes</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">CA Total</th>
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Dernière commande</th>
                {canWrite() && (
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(customer)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                        customer.customer_type === 'professionnel' 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {customer.customer_type === 'professionnel' ? (
                          <Building2 className="w-5 h-5" />
                        ) : (
                          <>{(customer.first_name?.[0] || '?')}{(customer.last_name?.[0] || '')}</>
                        )}
                      </div>
                      <div>
                        {customer.customer_type === 'professionnel' && customer.company_name ? (
                          <>
                            <div className="font-semibold">{customer.company_name}</div>
                            <div className="text-xs text-muted-foreground">{customer.first_name} {customer.last_name} • {customer.email}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-semibold">{customer.first_name} {customer.last_name}</div>
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {customer.city ? `${customer.city}, ${customer.country || ''}` : customer.country || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm tabular-nums">{customer.orders_count || 0}</td>
                  <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(customer.total_spent)}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(customer.last_order_at)}</td>
                  {canWrite() && (
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(customer)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          {canDelete() && (
                            <DropdownMenuItem 
                              onClick={() => setDeletingCustomer(customer)}
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

      <AlertDialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le client "{deletingCustomer?.first_name} {deletingCustomer?.last_name}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleteCustomer.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCustomer.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
