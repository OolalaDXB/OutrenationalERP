import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { customers, formatCurrency, formatDate } from "@/data/demo-data";
import { CustomerFormModal } from "@/components/forms/CustomerFormModal";

export function CustomersPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Tous les clients</h2>
          <p className="text-sm text-muted-foreground">{customers.length} clients</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          Nouveau client
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex gap-3 p-4 border-b border-border bg-secondary">
          <input 
            type="text" 
            placeholder="Rechercher client..." 
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
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 cursor-pointer transition-colors">
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
      </div>

      <CustomerFormModal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        onSubmit={(data) => console.log("New customer:", data)} 
      />
    </div>
  );
}
