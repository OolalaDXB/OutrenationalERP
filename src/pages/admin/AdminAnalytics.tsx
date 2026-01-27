import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, Building2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminAnalytics() {
  // Fetch all tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['analytics-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, status, created_at, settings')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch users count
  const { data: usersCount } = useQuery({
    queryKey: ['analytics-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenant_users')
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count || 0;
    },
  });

  // Fetch pending requests
  const { data: requestsPending } = useQuery({
    queryKey: ['analytics-requests-pending'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenant_requests' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count || 0;
    },
  });

  // Calculate stats
  const planPrices: Record<string, number> = { PRO: 149, BUSINESS: 249, BUSINESS_PLUS: 399, ENTERPRISE: 349 };
  
  const plansDistribution = tenants?.reduce((acc: Record<string, number>, t) => {
    const plan = (t.settings as any)?.plan_code || 'NONE';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {}) || {};

  const mrr = Object.entries(plansDistribution).reduce((sum, [plan, count]) => {
    return sum + (planPrices[plan] || 0) * count;
  }, 0);

  const tenantsTotal = tenants?.length || 0;
  const tenantsActive = tenants?.filter(t => t.status === 'active').length || 0;

  // Tenants without plan
  const tenantsWithoutPlan = tenants?.filter(t => !(t.settings as any)?.plan_code) || [];

  const isLoading = tenantsLoading;

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
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
        <h2 className="text-lg font-semibold mb-4">Revenue</h2>
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mrr.toLocaleString('fr-FR')}€</div>
              <p className="text-xs text-muted-foreground mt-1">Basé sur les plans actifs</p>
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
              <div className="text-3xl font-bold">
                {tenantsActive ? Math.round(mrr / tenantsActive) : 0}€
              </div>
              <p className="text-xs text-muted-foreground mt-1">Par tenant actif</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">LTV estimé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {tenantsActive ? Math.round((mrr / tenantsActive) * 24) : 0}€
              </div>
              <p className="text-xs text-muted-foreground mt-1">Hypothèse 24 mois</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Growth Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Growth</h2>
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tenants total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tenantsTotal}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Nouveaux (30j)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">+0</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{usersCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Demandes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{requestsPending || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">En attente</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Plans Distribution */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Répartition par plan</h2>
        <Card>
          <CardContent className="pt-6">
            {Object.keys(plansDistribution).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(plansDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([plan, count]) => {
                    const total = Object.values(plansDistribution).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    const revenue = (planPrices[plan] || 0) * count;
                    return (
                      <div key={plan} className="flex items-center gap-4">
                        <div className="w-32 font-medium">{plan === 'NONE' ? 'Sans plan' : plan}</div>
                        <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-20 text-right">{count} ({percentage}%)</div>
                        <div className="w-24 text-right text-muted-foreground">{revenue}€/m</div>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Tenants sans plan
              </CardTitle>
              <CardDescription>{tenantsWithoutPlan.length} tenant(s) n'ont pas de plan assigné</CardDescription>
            </CardHeader>
            <CardContent>
              {tenantsWithoutPlan.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tenantsWithoutPlan.slice(0, 10).map(t => (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <span>{t.name}</span>
                      <Badge variant="outline">Sans plan</Badge>
                    </div>
                  ))}
                  {tenantsWithoutPlan.length > 10 && (
                    <p className="text-xs text-muted-foreground">+ {tenantsWithoutPlan.length - 10} autres</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-green-600">Tous les tenants ont un plan ✓</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Engagement utilisateurs
              </CardTitle>
              <CardDescription>Activité des utilisateurs sur 7 jours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Utilisateurs total</span>
                  <span className="font-medium">{usersCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tenants actifs</span>
                  <span className="font-medium">{tenantsActive}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ratio utilisateurs/tenant</span>
                  <span className="font-medium">
                    {tenantsActive 
                      ? (usersCount ? (usersCount / tenantsActive).toFixed(1) : 0)
                      : 0}
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
