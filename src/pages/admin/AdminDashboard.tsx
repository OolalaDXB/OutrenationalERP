import { useQuery } from '@tanstack/react-query';
import { Building2, FileText, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

export function AdminDashboard() {
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

  // Fetch pending requests count
  const { data: pendingRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['admin-pending-requests'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('tenant_requests' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch total users count
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

  const stats = [
    {
      title: 'Tenants actifs',
      value: tenantsCount,
      loading: loadingTenants,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Demandes en attente',
      value: pendingRequests,
      loading: loadingRequests,
      icon: FileText,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Utilisateurs total',
      value: usersCount,
      loading: loadingUsers,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Admin</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la plateforme Sillon</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => window.location.href = '/admin/requests'}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10">
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-medium">Traiter les demandes</h3>
                <p className="text-sm text-muted-foreground">
                  {pendingRequests || 0} demande(s) en attente
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => window.location.href = '/admin/tenants'}>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Building2 className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium">Gérer les tenants</h3>
                <p className="text-sm text-muted-foreground">
                  {tenantsCount || 0} tenant(s) actifs
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
