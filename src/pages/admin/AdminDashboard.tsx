import { useQuery } from '@tanstack/react-query';
import { 
  Building2, 
  FileText, 
  Users, 
  TrendingUp, 
  ArrowUpRight,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Analytics {
  tenants_total: number;
  tenants_active: number;
  tenants_new_30d: number;
  users_total: number;
  users_active_7d: number;
  requests_pending: number;
  plans_distribution: Record<string, number>;
}

export function AdminDashboard() {
  const navigate = useNavigate();

  // Fetch tenants count
  const { data: tenantsCount, isLoading: loadingTenants } = useQuery({
    queryKey: ['admin-tenants-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pendingRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['admin-pending-requests'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenant_requests' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) return 0;
      return count || 0;
    },
  });

  const { data: usersCount, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenant_users')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Recent tenants with settings for plan distribution
  const { data: recentTenants } = useQuery({
    queryKey: ['admin-recent-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, slug, status, created_at, settings')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  // Fetch all tenants for stats
  const { data: allTenants } = useQuery({
    queryKey: ['admin-all-tenants-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, status, created_at, settings');
      if (error) throw error;
      return data;
    },
  });

  // Calculate plan distribution and MRR
  const planPrices: Record<string, number> = {
    PRO: 149,
    BUSINESS: 249,
    BUSINESS_PLUS: 399,
    ENTERPRISE: 349,
  };
  
  const plansDistribution = allTenants?.reduce((acc: Record<string, number>, t) => {
    const plan = (t.settings as any)?.plan_code || 'NONE';
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {}) || {};

  const mrr = Object.entries(plansDistribution).reduce((sum, [plan, count]) => {
    return sum + (planPrices[plan] || 0) * count;
  }, 0);

  const stats = {
    tenants: tenantsCount ?? 0,
    tenantsNew: 0, // Would need date filtering
    users: usersCount ?? 0,
    usersActive: 0,
    pending: pendingRequests ?? 0,
  };

  const isLoading = loadingTenants || loadingRequests || loadingUsers;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Control Panel</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la plateforme Sillon</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* MRR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR estimé
            </CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <CreditCard className="w-4 h-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-3xl font-bold">{mrr.toLocaleString('fr-FR')}€</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Basé sur les plans actifs
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tenants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tenants actifs
            </CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building2 className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold">{stats.tenants}</div>
                {stats.tenantsNew > 0 && (
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    +{stats.tenantsNew} ce mois
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilisateurs
            </CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold">{stats.users}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.usersActive} actifs (7j)
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card className={stats.pending > 0 ? 'border-amber-500/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Demandes en attente
            </CardTitle>
            <div className={`p-2 rounded-lg ${stats.pending > 0 ? 'bg-amber-500/10' : 'bg-muted'}`}>
              <FileText className={`w-4 h-4 ${stats.pending > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-3xl font-bold">{stats.pending}</div>
                {stats.pending > 0 && (
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-amber-600"
                    onClick={() => navigate('/admin/requests')}
                  >
                    Traiter maintenant →
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plans Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par plan</CardTitle>
            <CardDescription>Distribution des tenants par offre</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(plansDistribution).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(plansDistribution)
                  .sort(([, a], [, b]) => b - a)
                  .map(([plan, count]) => {
                    const total = Object.values(plansDistribution).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={plan} className="flex items-center gap-3">
                        <div className="w-24 text-sm font-medium">
                          {plan === 'NONE' ? 'Sans plan' : plan}
                        </div>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-16 text-sm text-right text-muted-foreground">
                          {count} ({percentage}%)
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Données non disponibles
              </div>
            )}
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
              Voir tout
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentTenants && recentTenants.length > 0 ? (
              <div className="space-y-3">
                {recentTenants.map((tenant) => (
                  <div 
                    key={tenant.id} 
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tenant.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {(tenant.settings as any)?.plan_code || 'NONE'}
                      </Badge>
                      <Badge 
                        variant={tenant.status === 'active' ? 'default' : 'secondary'}
                      >
                        {tenant.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Aucun tenant récent
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card 
            className="hover:border-primary/50 transition-colors cursor-pointer" 
            onClick={() => navigate('/admin/requests')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium">Traiter les demandes</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.pending || 0} demande(s) en attente
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="hover:border-primary/50 transition-colors cursor-pointer" 
            onClick={() => navigate('/admin/tenants')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Building2 className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium">Gérer les tenants</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.tenants || 0} tenant(s) actifs
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="hover:border-primary/50 transition-colors cursor-pointer" 
            onClick={() => navigate('/admin/plans')}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CreditCard className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-medium">Plans & Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  Configurer les offres
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
