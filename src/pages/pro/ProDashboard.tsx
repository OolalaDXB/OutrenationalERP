import { Link } from "react-router-dom";
import { Package, FileText, TrendingUp, Clock } from "lucide-react";
import { useProAuth } from "@/hooks/useProAuth";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";

export function ProDashboard() {
  const { customer } = useProAuth();
  const { itemCount, getTotal } = useCart();

  // Fetch customer's recent orders
  const { data: recentOrders = [] } = useQuery({
    queryKey: ['pro_orders', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id
  });

  const totalSpent = recentOrders.reduce((sum, order) => sum + (order.total || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold">
          Bienvenue, {customer?.company_name || customer?.first_name || 'Client Pro'}
        </h1>
        <p className="text-muted-foreground">
          Votre remise professionnelle : <span className="font-semibold text-primary">{customer?.discount_rate || 0}%</span>
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/pro/cart" className="bg-card rounded-xl border border-border p-4 hover:border-primary transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{itemCount}</p>
              <p className="text-sm text-muted-foreground">Articles en panier</p>
            </div>
          </div>
        </Link>

        <Link to="/pro/orders" className="bg-card rounded-xl border border-border p-4 hover:border-primary transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold">{recentOrders.length}</p>
              <p className="text-sm text-muted-foreground">Commandes récentes</p>
            </div>
          </div>
        </Link>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
              <p className="text-sm text-muted-foreground">Total commandé</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{customer?.payment_terms || 30}j</p>
              <p className="text-sm text-muted-foreground">Délai de paiement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Browse catalog */}
        <Link 
          to="/pro/catalog" 
          className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl p-6 hover:opacity-90 transition-opacity"
        >
          <Package className="w-8 h-8 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Parcourir le catalogue</h3>
          <p className="text-primary-foreground/80 text-sm">
            Découvrez nos nouveautés et passez commande avec votre remise pro.
          </p>
        </Link>

        {/* View orders */}
        <Link 
          to="/pro/orders" 
          className="bg-card border border-border rounded-xl p-6 hover:border-primary transition-colors"
        >
          <FileText className="w-8 h-8 mb-3 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-1">Historique des commandes</h3>
          <p className="text-muted-foreground text-sm">
            Consultez vos commandes passées et leur statut de livraison.
          </p>
        </Link>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Dernières commandes</h3>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.slice(0, 3).map(order => (
              <Link 
                key={order.id} 
                to="/pro/orders" 
                className="flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at || '').toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(order.total)}</p>
                  <p className="text-sm text-muted-foreground capitalize">{order.status}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
