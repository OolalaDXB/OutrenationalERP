import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Users, TrendingUp, Building2, CreditCard, Package, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function AdminAnalytics() {
  const navigate = useNavigate();

  // Fetch tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['analytics-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch users count
  const { data: usersCount } = useQuery({
    queryKey: ['analytics-users'],
    queryFn: async () => {
      const { count } = await supabase.from('tenant_users').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  // Fetch plans
  const { data: plans } = useQuery({
    queryKey: ['sillon-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('sillon_plans').select('code, name, base_price_monthly');
      return data || [];
    },
  });

  // Fetch platform-wide stats
  const { data: platformStats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      // Total products across all tenants
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Total orders
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      // Total revenue (sum of all orders)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total')
        .is('deleted_at', null);
      
      const totalRevenue = ordersData?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;

      // Orders last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('total')
        .is('deleted_at', null)
        .gte('created_at', thirtyDaysAgo.toISOString());
      
      const revenue30d = recentOrders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;

      return {
        productsCount: productsCount || 0,
        ordersCount: ordersCount || 0,
        totalRevenue,
        revenue30d,
        orders30d: recentOrders?.length || 0,
      };
    },
  });

  // Calculate metrics
  const planPrices = plans?.reduce((acc, p) => ({ ...acc, [p.code]: Number(p.base_price_monthly) }), {} as Record<string, number>) || {};
  
  const planCounts = tenants?.reduce((acc, t) => {
    const plan = t.plan_code || 'NONE';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const mrr = Object.entries(planCounts).reduce((sum, [plan, count]) => {
    return sum + (planPrices[plan] || 0) * count;
  }, 0);

  const activeTenants = tenants?.filter(t => t.status === 'active').length || 0;
  const arpu = activeTenants > 0 ? Math.round(mrr / activeTenants) : 0;
  const ltv = arpu * 24; // Hypothèse 24 mois

  // Tenants without proper plan
  const tenantsWithoutPlan = tenants?.filter(t => !t.plan_code || t.plan_code === 'starter') || [];

  // New tenants this month
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newTenants30d = tenants?.filter(t => new Date(t.created_at) > thirtyDaysAgo).length || 0;

  if (tenantsLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Métriques et santé de la plateforme</p>
      </div>

      {/* Revenue Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-green-500" />
          Revenue
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{mrr.toLocaleString('fr-FR')}€</div>
              <p className="text-xs text-muted-foreground mt-1">Revenus récurrents mensuels</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ARR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(mrr * 12).toLocaleString('fr-FR')}€</div>
              <p className="text-xs text-muted-foreground mt-1">Projection annuelle</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ARPU</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{arpu}€</div>
              <p className="text-xs text-muted-foreground mt-1">Par tenant actif/mois</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">LTV estimé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ltv.toLocaleString('fr-FR')}€</div>
              <p className="text-xs text-muted-foreground mt-1">Hypothèse 24 mois</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Growth Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Growth
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tenants total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tenants?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{activeTenants} actifs</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Nouveaux (30j)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">+{newTenants30d}</div>
              <p className="text-xs text-muted-foreground mt-1">Ce mois</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{usersCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ~{activeTenants ? Math.round(usersCount! / activeTenants) : 0} par tenant
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taux rétention</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {tenants?.length ? Math.round((activeTenants / tenants.length) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tenants actifs</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Platform Activity */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-purple-500" />
          Activité plateforme
        </h2>
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Produits total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(platformStats?.productsCount || 0).toLocaleString('fr-FR')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commandes total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(platformStats?.ordersCount || 0).toLocaleString('fr-FR')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">GMV total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(platformStats?.totalRevenue || 0).toLocaleString('fr-FR')}€</div>
              <p className="text-xs text-muted-foreground mt-1">Volume brut marchandises</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">GMV (30j)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(platformStats?.revenue30d || 0).toLocaleString('fr-FR')}€</div>
              <p className="text-xs text-muted-foreground mt-1">{platformStats?.orders30d || 0} commandes</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Plans Distribution */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Répartition par plan</h2>
        <Card>
          <CardContent className="pt-6">
            {Object.entries(planCounts).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(planCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([plan, count]) => {
                    const total = Object.values(planCounts).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    const revenue = (planPrices[plan] || 0) * count;
                    const planName = plans?.find(p => p.code === plan)?.name || plan;
                    return (
                      <div key={plan} className="flex items-center gap-4">
                        <div className="w-32 font-medium">
                          {plan === 'NONE' || plan === 'starter' ? 'Sans plan' : planName}
                        </div>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-20 text-right text-sm">{count} ({percentage}%)</div>
                        <div className="w-24 text-right text-sm text-muted-foreground">
                          {revenue > 0 ? `${revenue}€/m` : '-'}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Pas de données</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Health Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Santé</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className={tenantsWithoutPlan.length > 0 ? 'border-amber-500/50' : ''}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${tenantsWithoutPlan.length > 0 ? 'text-amber-500' : 'text-green-500'}`} />
                Tenants sans plan payant
              </CardTitle>
              <CardDescription>
                {tenantsWithoutPlan.length} tenant(s) n'ont pas de plan payant assigné
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tenantsWithoutPlan.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tenantsWithoutPlan.slice(0, 10).map(t => (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted p-2 rounded"
                      onClick={() => navigate(`/admin/tenants/${t.id}`)}
                    >
                      <span>{t.name}</span>
                      <Badge variant="outline">Sans plan</Badge>
                    </div>
                  ))}
                  {tenantsWithoutPlan.length > 10 && (
                    <p className="text-xs text-muted-foreground">+ {tenantsWithoutPlan.length - 10} autres</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-green-600">Tous les tenants ont un plan payant ✓</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Engagement utilisateurs
              </CardTitle>
              <CardDescription>Distribution des rôles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Utilisateurs total</span>
                  <span className="font-medium">{usersCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tenants actifs</span>
                  <span className="font-medium">{activeTenants}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Moyenne users/tenant</span>
                  <span className="font-medium">
                    {activeTenants ? Math.round(usersCount! / activeTenants) : 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
