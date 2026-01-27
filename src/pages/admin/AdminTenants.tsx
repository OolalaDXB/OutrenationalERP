import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Building2, Users, MoreHorizontal, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { TenantDetailDrawer } from '@/components/admin/TenantDetailDrawer';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  plan_code?: string;
  plan_version?: string;
  settings: {
    plan_code?: string;
  } | null;
}

export function AdminTenants() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: tenants, isLoading, refetch } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Tenant[];
    },
  });

  // Fetch user counts per tenant
  const { data: userCounts } = useQuery({
    queryKey: ['admin-tenant-user-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_users')
        .select('tenant_id');
      if (error) throw error;
      
      // Count users per tenant
      const counts: Record<string, number> = {};
      data?.forEach((row) => {
        counts[row.tenant_id] = (counts[row.tenant_id] || 0) + 1;
      });
      return counts;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Actif</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspendu</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (planCode?: string) => {
    switch (planCode) {
      case 'PRO':
        return <Badge variant="default">Pro</Badge>;
      case 'STARTER':
        return <Badge variant="secondary">Starter</Badge>;
      case 'ENTERPRISE':
        return <Badge className="bg-purple-500">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{planCode || 'N/A'}</Badge>;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground">
            Gestion des organisations sur Sillon
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Building2 className="w-3 h-3 mr-1" />
            {tenants?.length || 0} tenant(s)
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Utilisateurs</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : tenants?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun tenant
                  </TableCell>
                </TableRow>
              ) : (
                tenants?.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                        {tenant.slug}
                      </code>
                    </TableCell>
                    <TableCell>{getPlanBadge(tenant.settings?.plan_code)}</TableCell>
                    <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>{userCounts?.[tenant.id] || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(tenant.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setDrawerOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => window.open(`/t/${tenant.slug}/`, '_blank')}>
                            Accéder au backoffice
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Suspendre
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TenantDetailDrawer
        tenant={selectedTenant}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
