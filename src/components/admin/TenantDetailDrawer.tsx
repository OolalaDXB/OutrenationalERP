import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Users,
  Settings,
  BarChart3,
  MoreHorizontal,
  UserMinus,
  KeyRound,
  ShieldCheck,
  Package,
  ShoppingCart,
  TrendingUp,
  Crown,
  Store,
  UserCheck,
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  plan_code?: string;
  plan_version?: string;
  settings?: {
    plan_code?: string;
  } | null;
}

interface TenantUser {
  id: string;
  user_id: string;
  tenant_id: string;
  role: 'admin' | 'staff' | 'viewer';
  is_owner: boolean;
  created_at: string;
  user_email?: string;
}

interface ProCustomer {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  approved: boolean;
  created_at: string;
}

interface TenantDetailDrawerProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantDetailDrawer({ tenant, open, onOpenChange }: TenantDetailDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: TenantUser | null }>({
    open: false,
    user: null,
  });

  // Fetch ERP users (staff/admin from tenant_users)
  const { data: tenantUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-tenant-users', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      // Get tenant_users
      const { data: users, error } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('is_owner', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get emails from public.users table (if accessible)
      const userIds = users?.map((u) => u.user_id) || [];
      if (userIds.length === 0) return [];
      
      const { data: profiles } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);

      const emailMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);

      return (users || []).map((u) => ({
        ...u,
        user_email: emailMap.get(u.user_id) || 'Email inconnu',
      })) as TenantUser[];
    },
    enabled: !!tenant?.id && open,
  });

  // Fetch Pro customers (customers with auth_user_id)
  const { data: proCustomers, isLoading: loadingProCustomers } = useQuery({
    queryKey: ['admin-tenant-pro-customers', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('id, auth_user_id, email, first_name, last_name, company_name, approved, created_at')
        .eq('tenant_id', tenant.id)
        .not('auth_user_id', 'is', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as ProCustomer[];
    },
    enabled: !!tenant?.id && open,
  });

  // Fetch tenant stats
  const { data: tenantStats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-tenant-stats', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) return null;

      // Products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null);

      // Orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null);

      // Total revenue (from paid orders)
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total')
        .eq('tenant_id', tenant.id)
        .eq('payment_status', 'paid')
        .is('deleted_at', null);

      const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

      // Stock value
      const { data: stockData } = await supabase
        .from('products')
        .select('stock, cost_price, selling_price')
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null);

      const stockValue = stockData?.reduce((sum, p) => {
        const price = p.cost_price || p.selling_price || 0;
        return sum + (p.stock || 0) * price;
      }, 0) || 0;

      const totalStock = stockData?.reduce((sum, p) => sum + (p.stock || 0), 0) || 0;

      // Customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .is('deleted_at', null);

      return {
        productsCount: productsCount || 0,
        ordersCount: ordersCount || 0,
        totalRevenue,
        stockValue,
        totalStock,
        customersCount: customersCount || 0,
      };
    },
    enabled: !!tenant?.id && open && activeTab === 'analytics',
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'staff' | 'viewer' }) => {
      const { error } = await supabase
        .from('tenant_users')
        .update({ role: newRole } as any)
        .eq('tenant_id', tenant!.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-users', tenant?.id] });
      toast.success('Rôle mis à jour');
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Remove user mutation
  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('tenant_users')
        .delete()
        .eq('tenant_id', tenant!.id)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-users', tenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-user-counts'] });
      toast.success('Utilisateur retiré du tenant');
      setDeleteDialog({ open: false, user: null });
    },
    onError: (error: Error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  // Reset password (send reset email via Supabase Admin API - requires edge function)
  const handleResetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Email de réinitialisation envoyé à ${email}`);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const getRoleBadge = (role: string, isOwner: boolean) => {
    if (isOwner) {
      return (
        <Badge className="bg-amber-500">
          <Crown className="w-3 h-3 mr-1" />
          Owner
        </Badge>
      );
    }
    switch (role) {
      case 'admin':
        return <Badge className="bg-purple-500">Admin</Badge>;
      case 'staff':
        return <Badge variant="default">Staff</Badge>;
      case 'viewer':
        return <Badge variant="secondary">Viewer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  if (!tenant) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {tenant.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="text-lg">{tenant.name}</div>
                <code className="text-xs text-muted-foreground font-normal">
                  {tenant.slug}
                </code>
              </div>
            </SheetTitle>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="users" className="flex-1">
                <Users className="w-4 h-4 mr-2" />
                Utilisateurs
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">
                <Settings className="w-4 h-4 mr-2" />
                Paramètres
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex-1">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              {/* ERP Users Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">
                    Équipe ERP ({tenantUsers?.length || 0})
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Accès au backoffice (admin, staff, viewer)
                </p>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Depuis</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingUsers ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                          </TableRow>
                        ))
                      ) : tenantUsers?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                            Aucun utilisateur ERP
                          </TableCell>
                        </TableRow>
                      ) : (
                        tenantUsers?.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell className="font-medium text-sm">
                              {user.user_email}
                            </TableCell>
                            <TableCell>
                              {user.is_owner ? (
                                getRoleBadge(user.role, true)
                              ) : (
                                <Select
                                  value={user.role}
                                  onValueChange={(value: 'admin' | 'staff' | 'viewer') =>
                                    updateRoleMutation.mutate({ userId: user.user_id, newRole: value })
                                  }
                                >
                                  <SelectTrigger className="h-7 w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {format(new Date(user.created_at), 'dd/MM/yy', { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleResetPassword(user.user_email || '')}
                                  >
                                    <KeyRound className="w-4 h-4 mr-2" />
                                    Reset mot de passe
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    disabled={user.is_owner}
                                    onClick={() => setDeleteDialog({ open: true, user })}
                                  >
                                    <UserMinus className="w-4 h-4 mr-2" />
                                    Retirer l'accès
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pro Customers Section */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">
                    Clients Pro ({proCustomers?.length || 0})
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Comptes clients avec accès au portail Pro
                </p>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Depuis</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingProCustomers ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                          </TableRow>
                        ))
                      ) : proCustomers?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                            Aucun client Pro
                          </TableCell>
                        </TableRow>
                      ) : (
                        proCustomers?.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {customer.company_name || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Sans nom'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.email}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {customer.approved ? (
                                <Badge variant="default" className="bg-green-600">Approuvé</Badge>
                              ) : (
                                <Badge variant="secondary">En attente</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {format(new Date(customer.created_at), 'dd/MM/yy', { locale: fr })}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleResetPassword(customer.email)}
                                  >
                                    <KeyRound className="w-4 h-4 mr-2" />
                                    Reset mot de passe
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Plan & Capabilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <label className="text-muted-foreground">Plan</label>
                      <p className="font-medium">{tenant.plan_code || tenant.settings?.plan_code || 'STARTER'}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-muted-foreground">Status</label>
                      <p className="font-medium capitalize">{tenant.status}</p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Créé le</label>
                      <p className="font-medium">
                        {format(new Date(tenant.created_at), 'dd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <label className="text-muted-foreground">Slug</label>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{tenant.slug}</code>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      Modifier le plan (bientôt disponible)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => window.open(`/t/${tenant.slug}/`, '_blank')}
                  >
                    Accéder au backoffice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    disabled
                  >
                    Suspendre le tenant
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              {loadingStats ? (
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-6 w-16" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Package className="w-4 h-4" />
                        Produits
                      </div>
                      <p className="text-2xl font-bold">{tenantStats?.productsCount || 0}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <ShoppingCart className="w-4 h-4" />
                        Commandes
                      </div>
                      <p className="text-2xl font-bold">{tenantStats?.ordersCount || 0}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <TrendingUp className="w-4 h-4" />
                        Chiffre d'affaires
                      </div>
                      <p className="text-2xl font-bold">{formatCurrency(tenantStats?.totalRevenue || 0)}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Package className="w-4 h-4" />
                        Stock total
                      </div>
                      <p className="text-2xl font-bold">{tenantStats?.totalStock || 0}</p>
                      <p className="text-xs text-muted-foreground">
                        Valeur: {formatCurrency(tenantStats?.stockValue || 0)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                        <Users className="w-4 h-4" />
                        Clients
                      </div>
                      <p className="text-2xl font-bold">{tenantStats?.customersCount || 0}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer l'accès utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir retirer l'accès de{' '}
              <strong>{deleteDialog.user?.user_email}</strong> à ce tenant ?
              L'utilisateur ne pourra plus accéder au backoffice.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteDialog.user && removeUserMutation.mutate(deleteDialog.user.user_id)}
            >
              Retirer l'accès
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
