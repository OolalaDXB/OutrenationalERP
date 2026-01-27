import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Building2, Users, Settings, Shield, Activity, ExternalLink, MoreHorizontal, Package, ShoppingCart, Euro, Boxes, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSillonAdmin } from '@/hooks/useSillonAdmin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Json } from '@/integrations/supabase/types';

interface TenantSettings {
  plan_code?: string;
  plan_version?: string;
  capabilities?: Record<string, Json>;
  capability_overrides?: Record<string, Json>;
  discount_percent?: number;
  contact_email?: string;
  contact_phone?: string;
  dedicated_database?: boolean;
  [key: string]: Json | undefined;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  settings: TenantSettings | null;
}

interface TenantUser {
  id: string;
  user_id: string;
  role: 'admin' | 'staff' | 'viewer';
  created_at: string;
  is_owner: boolean;
  tenant_id: string;
  updated_at: string;
}

interface ERPUser extends TenantUser {
  email: string;
  first_name: string;
  last_name: string;
}

interface ProCustomer {
  id: string;
  company_name: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  customer_type: string | null;
  auth_user_id: string | null;
  created_at: string;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  base_price_monthly: number;
  version: string;
  capabilities: Record<string, Json>;
}

export function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useSillonAdmin();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (error) throw error;
      return data as unknown as Tenant;
    },
    enabled: !!tenantId,
  });

  const { data: erpUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-tenant-erp-users', tenantId],
    queryFn: async () => {
      const { data: tenantUsers } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (!tenantUsers?.length) return [];

      return tenantUsers.map((tu): ERPUser => ({
        ...tu,
        email: 'Email non disponible',
        first_name: '',
        last_name: '',
      }));
    },
    enabled: !!tenantId,
  });

  const { data: proCustomers } = useQuery({
    queryKey: ['admin-tenant-pro-customers', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, company_name, email, first_name, last_name, customer_type, auth_user_id, created_at')
        .eq('tenant_id', tenantId)
        .eq('customer_type', 'pro')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return (data || []) as ProCustomer[];
    },
    enabled: !!tenantId,
  });

  const { data: plans } = useQuery({
    queryKey: ['sillon-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('sillon_plans').select('*').eq('is_active', true).order('display_order');
      return (data || []) as Plan[];
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['admin-tenant-analytics', tenantId],
    queryFn: async () => {
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const ordersCount = recentOrders?.length || 0;
      const revenue30d = recentOrders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;
      const pendingOrders = recentOrders?.filter(o => o.status === 'pending').length || 0;

      const { data: stockData } = await supabase
        .from('products')
        .select('stock, cost_price')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);
      
      const stockValue = stockData?.reduce((sum, p) => sum + ((p.stock || 0) * (Number(p.cost_price) || 0)), 0) || 0;

      const { count: proCustomersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('customer_type', 'pro')
        .is('deleted_at', null);

      const { count: totalOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      const { data: allOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);
      
      const totalRevenue = allOrders?.reduce((sum, o) => sum + (Number(o.total) || 0), 0) || 0;

      return {
        productsCount: productsCount || 0,
        ordersCount,
        revenue30d,
        pendingOrders,
        stockValue,
        proCustomersCount: proCustomersCount || 0,
        totalOrdersCount: totalOrdersCount || 0,
        totalRevenue,
      };
    },
    enabled: !!tenantId,
  });

  const assignPlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      const plan = plans?.find(p => p.code === planCode);
      if (!plan) throw new Error('Plan non trouvé');
      const newSettings = { 
        ...(tenant?.settings || {}), 
        plan_code: plan.code, 
        plan_version: plan.version, 
        capabilities: plan.capabilities 
      };
      await supabase.from('tenants').update({
        settings: newSettings
      }).eq('id', tenantId);
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', tenantId] }); 
      toast.success('Plan assigné'); 
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'admin' | 'staff' | 'viewer' }) => {
      await supabase.from('tenant_users').update({ role }).eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-erp-users', tenantId] });
      toast.success('Rôle mis à jour');
    },
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!tenant) return <div className="p-8 text-center"><p>Tenant non trouvé</p></div>;

  const capabilities = tenant.settings?.capabilities || {};
  const overrides = tenant.settings?.capability_overrides || {};
  const discount = tenant.settings?.discount_percent || 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tenants')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>{tenant.status}</Badge>
              {discount > 0 && <Badge variant="outline" className="text-green-600">-{discount}%</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{tenant.slug}</code>
              <span className="mx-2">•</span>
              Créé le {format(new Date(tenant.created_at), 'dd MMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.open(`/t/${tenant.slug}/`, '_blank')}>
          <ExternalLink className="w-4 h-4 mr-2" />Accéder
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview"><Building2 className="w-4 h-4 mr-2" />Aperçu</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Utilisateurs ({(erpUsers?.length || 0) + (proCustomers?.length || 0)})</TabsTrigger>
          <TabsTrigger value="analytics"><Activity className="w-4 h-4 mr-2" />Analytique</TabsTrigger>
          <TabsTrigger value="capabilities"><Shield className="w-4 h-4 mr-2" />Capacités</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Produits</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{analytics?.productsCount || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Commandes (30j)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{analytics?.ordersCount || 0}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">CA (30j)</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{(analytics?.revenue30d || 0).toLocaleString('fr-FR')}€</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Clients Pro</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{analytics?.proCustomersCount || 0}</div></CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Plan</p><p className="font-medium">{tenant.settings?.plan_code || 'Aucun'}</p></div>
                  <div><p className="text-muted-foreground">Version</p><p className="font-medium">{tenant.settings?.plan_version || '-'}</p></div>
                  <div><p className="text-muted-foreground">Utilisateurs ERP</p><p className="font-medium">{erpUsers?.length || 0}</p></div>
                  <div><p className="text-muted-foreground">Clients Pro</p><p className="font-medium">{proCustomers?.length || 0}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Changer le plan</CardTitle></CardHeader>
              <CardContent>
                <Select value={tenant.settings?.plan_code || ''} onValueChange={(v) => assignPlanMutation.mutate(v)} disabled={!can('canAssignPlan')}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
                  <SelectContent>
                    {plans?.map((p) => <SelectItem key={p.code} value={p.code}>{p.name} — {p.base_price_monthly}€/mois</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Équipe ERP</CardTitle>
                <CardDescription>Utilisateurs avec accès au backoffice</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow><TableCell colSpan={4}><Skeleton className="h-8" /></TableCell></TableRow>
                    ) : erpUsers?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Aucun utilisateur</TableCell></TableRow>
                    ) : (
                      erpUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="font-medium">
                              {user.first_name || user.last_name 
                                ? `${user.first_name} ${user.last_name}`.trim() 
                                : 'Nom non renseigné'}
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Select 
                              value={user.role} 
                              onValueChange={(r) => updateUserRoleMutation.mutate({ id: user.id, role: r as 'admin' | 'staff' | 'viewer' })}
                              disabled={!can('canChangeUserRole')}
                            >
                              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="staff">Staff</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem disabled={!can('canResetPassword')}>Reset mot de passe</DropdownMenuItem>
                                <DropdownMenuItem disabled={!can('canResendEmail')}>Renvoyer email</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" disabled={!can('canDeleteUser')}>Supprimer</DropdownMenuItem>
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

            <Card>
              <CardHeader>
                <CardTitle>Clients Pro</CardTitle>
                <CardDescription>Clients avec accès au portail B2B</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Compte lié</TableHead>
                      <TableHead>Créé le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proCustomers?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Aucun client pro</TableCell></TableRow>
                    ) : (
                      proCustomers?.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.company_name || '-'}</TableCell>
                          <TableCell>{customer.first_name} {customer.last_name}</TableCell>
                          <TableCell>{customer.email}</TableCell>
                          <TableCell>
                            {customer.auth_user_id ? (
                              <Badge variant="default" className="text-xs">Lié</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Non lié</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(customer.created_at), 'dd/MM/yyyy')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Produits actifs</CardTitle>
                  <Package className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics?.productsCount || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Valeur stock</CardTitle>
                  <Boxes className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{(analytics?.stockValue || 0).toLocaleString('fr-FR')}€</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Commandes totales</CardTitle>
                  <ShoppingCart className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics?.totalOrdersCount || 0}</div>
                  {analytics?.pendingOrders ? (
                    <p className="text-xs text-amber-600 mt-1">{analytics.pendingOrders} en attente</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">CA total</CardTitle>
                  <Euro className="w-4 h-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{(analytics?.totalRevenue || 0).toLocaleString('fr-FR')}€</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance (30 derniers jours)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Commandes</p>
                    <p className="text-2xl font-bold">{analytics?.ordersCount || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Chiffre d'affaires</p>
                    <p className="text-2xl font-bold">{(analytics?.revenue30d || 0).toLocaleString('fr-FR')}€</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Panier moyen</p>
                    <p className="text-2xl font-bold">
                      {analytics?.ordersCount 
                        ? Math.round((analytics.revenue30d || 0) / analytics.ordersCount).toLocaleString('fr-FR') 
                        : 0}€
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  Clients Pro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Clients Pro actifs</p>
                    <p className="text-2xl font-bold">{analytics?.proCustomersCount || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Avec compte lié</p>
                    <p className="text-2xl font-bold">{proCustomers?.filter(c => c.auth_user_id).length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="capabilities">
          <Card>
            <CardHeader>
              <CardTitle>Capacités</CardTitle>
              <CardDescription>Plan: {tenant.settings?.plan_code || 'Aucun'} v{tenant.settings?.plan_version || '-'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Capacité</TableHead>
                    <TableHead>Valeur plan</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead>Effectif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(capabilities).map(([key, value]) => {
                    const override = overrides[key];
                    const effective = override !== undefined ? override : value;
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-mono text-sm">{key}</TableCell>
                        <TableCell>
                          {typeof value === 'boolean' ? (
                            <Badge variant={value ? 'default' : 'secondary'}>{value ? '✓' : '✗'}</Badge>
                          ) : Array.isArray(value) ? (
                            <code className="text-xs">{JSON.stringify(value)}</code>
                          ) : (
                            String(value)
                          )}
                        </TableCell>
                        <TableCell>
                          {override !== undefined ? (
                            <Badge variant="outline" className="text-amber-600">Override</Badge>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          {typeof effective === 'boolean' ? (
                            <Badge variant={effective ? 'default' : 'secondary'}>{effective ? '✓' : '✗'}</Badge>
                          ) : (
                            <span className="font-medium">{String(effective)}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Nom</Label><Input defaultValue={tenant.name} disabled={!can('canEditTenant')} /></div>
                  <div><Label>Slug</Label><Input value={tenant.slug} disabled /></div>
                  <div><Label>Email contact</Label><Input defaultValue={tenant.settings?.contact_email || ''} disabled={!can('canEditTenant')} /></div>
                  <div><Label>Téléphone</Label><Input defaultValue={tenant.settings?.contact_phone || ''} disabled={!can('canEditTenant')} /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Facturation</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Remise (%)</Label>
                    <Input type="number" min="0" max="100" defaultValue={discount} disabled={!can('canEditTenant')} />
                    <p className="text-xs text-muted-foreground mt-1">Réduction appliquée sur le prix du plan</p>
                  </div>
                  <div>
                    <Label>Base de données dédiée</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={tenant.settings?.dedicated_database ? 'default' : 'secondary'}>
                        {tenant.settings?.dedicated_database ? 'Oui' : 'Non'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">(Enterprise uniquement)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
