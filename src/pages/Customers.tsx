import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customers, orders, Customer, formatCurrency, formatDate } from "@/data/demo-data";
import { CustomerFormModal } from "@/components/forms/CustomerFormModal";
import { CustomerDrawer } from "@/components/drawers/CustomerDrawer";

export function CustomersPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Pays uniques
  const countries = useMemo(() => {
    const unique = new Set(customers.map((c) => c.country));
    return Array.from(unique).sort();
  }, []);

  // Filtrage
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        searchTerm === "" ||
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCountry = countryFilter === "all" || customer.country === countryFilter;

      return matchesSearch && matchesCountry;
    });
  }, [searchTerm, countryFilter]);

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedCustomer(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les clients</h2>
          <p className="text-sm text-muted-foreground">{filteredCustomers.length} clients</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Nouveau client
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex gap-3 p-4 border-b border-border bg-secondary flex-wrap">
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
            placeholder="Rechercher client, email, ville..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 max-w-[300px] px-3 py-2 rounded-md border border-border bg-card text-sm"
          />
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Client</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Localisation</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Commandes</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">CA Total</th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">Dernière commande</th>
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
                    <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary">
                      {customer.firstName[0]}{customer.lastName[0]}
                    </div>
                    <div>
                      <div className="font-semibold">{customer.firstName} {customer.lastName}</div>
                      <div className="text-xs text-muted-foreground">{customer.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{customer.city}, {customer.country}</td>
                <td className="px-6 py-4 text-sm tabular-nums">{customer.ordersCount}</td>
                <td className="px-6 py-4 font-semibold tabular-nums">{formatCurrency(customer.totalSpent)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{formatDate(customer.lastOrderAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredCustomers.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            Aucun client trouvé
          </div>
        )}
      </div>

      <CustomerFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={(data) => console.log("New customer:", data)}
      />
      <CustomerDrawer
        customer={selectedCustomer}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
