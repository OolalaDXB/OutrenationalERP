import { useQuery } from '@tanstack/react-query';
import { Building2, FileText, Users, CreditCard, TrendingUp, ArrowUpRight, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function AdminDashboard() {
  const navigate = useNavigate();

  // Fetch all tenants
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['admin-tenants-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch pending requests count
  const { data: pendingRequests } = useQuery({
    queryKey: ['admin-pending-requests'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenant_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch total users count
  const { data: usersCount } = useQuery({
    queryKey: ['admin-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenant_users')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch plans for pricing
  const { data: plans } = useQuery({
    queryKey: ['sillon-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('sillon_plans').select('code, base_price_monthly');
      return data || [];
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
  const suspendedTenants = tenants?.filter(t => t.status === 'suspended').length || 0;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newTenants30d = tenants?.filter(t => new Date(t.created_at) > thirtyDaysAgo).length || 0;

  // Tenants without proper plan
  const tenantsWithoutPlan = tenants?.filter(t => !t.plan_code || t.plan_code === 'starter') || [];

  if (tenantsLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Control Panel</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la plateforme Sillon</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR estimé</CardTitle>
            <CreditCard className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mrr.toLocaleString('fr-FR')}€</div>
            <p className="text-xs text-muted-foreground mt-1">
              ARR: {(mrr * 12).toLocaleString('fr-FR')}€
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tenants actifs</CardTitle>
            <Building2 className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeTenants}</div>
            <div className="flex items-center gap-2 mt-1">
              {newTenants30d > 0 && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />+{newTenants30d} ce mois
                </span>
              )}
              {suspendedTenants > 0 && (
                <span className="text-xs text-amber-600">{suspendedTenants} suspendu(s)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilisateurs</CardTitle>
            <Users className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{usersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~{activeTenants ? Math.round(usersCount! / activeTenants) : 0} par tenant
            </p>
          </CardContent>
        </Card>

        <Card className={pendingRequests && pendingRequests > 0 ? 'border-amber-500/50 bg-amber-50/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Demandes en attente</CardTitle>
            <FileText className={`w-4 h-4 ${pendingRequests && pendingRequests > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingRequests}</div>
            {pendingRequests && pendingRequests > 0 && (
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs text-amber-600" 
                onClick={() => navigate('/admin/requests')}
              >
                Traiter maintenant →
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plans Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par plan</CardTitle>
            <CardDescription>Distribution des tenants par offre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(planCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([plan, count]) => {
                  const total = Object.values(planCounts).reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const revenue = (planPrices[plan] || 0) * count;
                  return (
                    <div key={plan} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{plan === 'NONE' || plan === 'starter' ? 'Sans plan' : plan}</span>
                        <span className="text-muted-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all" 
                            style={{ width: `${pct}%` }} 
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          {revenue > 0 ? `${revenue}€/m` : '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Tenants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Tenants récents</CardTitle>
              <CardDescription>Dernières inscriptions</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/tenants')}>
              Voir tout<ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenants?.slice(0, 5).map((tenant) => (
                <div 
                  key={tenant.id} 
                  className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                  onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tenant.created_at), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {tenant.plan_code || 'starter'}
                    </Badge>
                    <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                      {tenant.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!tenants || tenants.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Aucun tenant</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {tenantsWithoutPlan.length > 0 && (
          <Card className="border-amber-500/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Attention requise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {tenantsWithoutPlan.length} tenant(s) sans plan payant assigné
                </p>
                <div className="flex flex-wrap gap-2">
                  {tenantsWithoutPlan.slice(0, 5).map(t => (
                    <Badge 
                      key={t.id} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => navigate(`/admin/tenants/${t.id}`)}
                    >
                      {t.name}
                    </Badge>
                  ))}
                  {tenantsWithoutPlan.length > 5 && (
                    <Badge variant="secondary">+{tenantsWithoutPlan.length - 5} autres</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => navigate('/admin/requests')}
              >
                <FileText className="w-4 h-4 mr-2" />
                <div className="text-left">
                  <p className="font-medium">Demandes</p>
                  <p className="text-xs text-muted-foreground">{pendingRequests} en attente</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => navigate('/admin/tenants')}
              >
                <Building2 className="w-4 h-4 mr-2" />
                <div className="text-left">
                  <p className="font-medium">Tenants</p>
                  <p className="text-xs text-muted-foreground">{tenants?.length || 0} total</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => navigate('/admin/users')}
              >
                <Users className="w-4 h-4 mr-2" />
                <div className="text-left">
                  <p className="font-medium">Utilisateurs</p>
                  <p className="text-xs text-muted-foreground">{usersCount} total</p>
                </div>
              </Button>
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => navigate('/admin/plans')}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                <div className="text-left">
                  <p className="font-medium">Plans & Pricing</p>
                  <p className="text-xs text-muted-foreground">Gérer les offres</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
