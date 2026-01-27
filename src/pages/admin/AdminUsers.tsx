import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Users, Search, Building2, MoreHorizontal, KeyRound, Mail, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSillonAdmin } from '@/hooks/useSillonAdmin';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface UserWithTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role: string;
  created_at: string;
  tenant_name: string;
  tenant_slug: string;
}

export function AdminUsers() {
  const navigate = useNavigate();
  const { can } = useSillonAdmin();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');

  // Fetch all tenant users with tenant info
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_users')
        .select(`
          id,
          user_id,
          tenant_id,
          role,
          created_at,
          tenants!inner (
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map((u: any) => ({
        id: u.id,
        user_id: u.user_id,
        tenant_id: u.tenant_id,
        role: u.role,
        created_at: u.created_at,
        tenant_name: u.tenants?.name || 'Unknown',
        tenant_slug: u.tenants?.slug || '',
      })) as UserWithTenant[];
    },
  });

  // Get unique tenants for filter
  const tenants = users 
    ? [...new Map(users.map(u => [u.tenant_id, { id: u.tenant_id, name: u.tenant_name }])).values()]
    : [];

  // Filter users
  const filteredUsers = users?.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (tenantFilter !== 'all' && u.tenant_id !== tenantFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return u.user_id.toLowerCase().includes(searchLower) || 
             u.tenant_name.toLowerCase().includes(searchLower);
    }
    return true;
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <p className="text-muted-foreground">Tous les utilisateurs de la plateforme</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.filter(u => u.role === 'admin').length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tenantFilter} onValueChange={setTenantFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les tenants</SelectItem>
            {tenants.map(t => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-xs">
                      {user.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-normal"
                        onClick={() => navigate(`/admin/tenants/${user.tenant_id}`)}
                      >
                        <Building2 className="w-3 h-3 mr-1" />
                        {user.tenant_name}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), 'dd MMM yyyy', { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/admin/tenants/${user.tenant_id}`)}>
                            <Building2 className="w-4 h-4 mr-2" />
                            Voir le tenant
                          </DropdownMenuItem>
                          {can('canResetPassword') && (
                            <DropdownMenuItem>
                              <KeyRound className="w-4 h-4 mr-2" />
                              Reset password
                            </DropdownMenuItem>
                          )}
                          {can('canResendEmail') && (
                            <DropdownMenuItem>
                              <Mail className="w-4 h-4 mr-2" />
                              Resend email
                            </DropdownMenuItem>
                          )}
                          {can('canDeleteUser') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </>
                          )}
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
    </div>
  );
}
