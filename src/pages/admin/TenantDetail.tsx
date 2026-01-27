import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ArrowLeft, Building2, Users, Settings, Shield, Activity, ExternalLink, MoreHorizontal, Package, ShoppingCart, Euro, Boxes, UserCheck, CreditCard, Clock, CheckCircle2, AlertCircle, FileText, Download, Plus, Wallet } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useSillonAdmin();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [newPaymentType, setNewPaymentType] = useState<'card' | 'sepa' | 'crypto'>('card');
  const [newPaymentLabel, setNewPaymentLabel] = useState('');
  const [newPaymentWallet, setNewPaymentWallet] = useState('');
  const [newPaymentNetwork, setNewPaymentNetwork] = useState('ethereum');

  // Fetch tenant
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch tenant users with user details from public.users table
  const { data: erpUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-tenant-erp-users', tenantId],
    queryFn: async () => {
      const { data: tenantUsers } = await supabase
        .from('tenant_users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      
      if (!tenantUsers?.length) return [];

      const userIds = tenantUsers.map(u => u.user_id);
      
      // Get user details from public.users table
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, active')
        .in('id', userIds);

      return tenantUsers.map(tu => {
        const userData = usersData?.find(u => u.id === tu.user_id);
        return {
          ...tu,
          email: userData?.email || 'Email non disponible',
          first_name: userData?.first_name || '',
          last_name: userData?.last_name || '',
          is_active: userData?.active ?? true,
        };
      });
    },
    enabled: !!tenantId,
  });

  // Fetch pro customers (customer_type = 'wholesale')
  const { data: proCustomers } = useQuery({
    queryKey: ['admin-tenant-pro-customers', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, company_name, email, first_name, last_name, customer_type, auth_user_id, created_at')
        .eq('tenant_id', tenantId)
        .eq('customer_type', 'wholesale')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch plans
  const { data: plans } = useQuery({
    queryKey: ['sillon-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('sillon_plans').select('*').eq('is_active', true).order('display_order');
      return data || [];
    },
  });

  // Fetch subscription
  const { data: subscription } = useQuery({
    queryKey: ['admin-tenant-subscription', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_subscriptions')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch invoices
  const { data: tenantInvoices } = useQuery({
    queryKey: ['admin-tenant-invoices', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('issue_date', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Fetch payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ['admin-tenant-payment-methods', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenant_payment_methods')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  // Analytics queries
  const { data: analytics } = useQuery({
    queryKey: ['admin-tenant-analytics', tenantId],
    queryFn: async () => {
      // Products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      // Orders last 30 days
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

      // Stock value (stock * purchase_price)
      const { data: stockData } = await supabase
        .from('products')
        .select('stock, purchase_price')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);
      
      const stockValue = stockData?.reduce((sum, p) => sum + ((p.stock || 0) * (Number(p.purchase_price) || 0)), 0) || 0;

      // Pro customers count (wholesale)
      const { count: proCustomersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('customer_type', 'wholesale')
        .is('deleted_at', null);

      // Total orders count
      const { count: totalOrdersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .is('deleted_at', null);

      // Total revenue
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

  // Mutations
  const assignPlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      const plan = plans?.find(p => p.code === planCode);
      if (!plan) throw new Error('Plan not found');
      const { error } = await supabase.from('tenants').update({
        plan_code: plan.code,
        plan_version: plan.version,
        capabilities: plan.capabilities,
        updated_at: new Date().toISOString(),
      }).eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', tenantId] }); 
      setSelectedPlanCode(null);
      toast.success('Plan assigné'); 
    },
    onError: () => toast.error('Erreur lors de l\'assignation du plan'),
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'admin' | 'staff' | 'viewer' }) => {
      const { error } = await supabase.from('tenant_users').update({ role, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-erp-users', tenantId] });
      toast.success('Rôle mis à jour');
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from('tenants').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', tenantId] });
      toast.success('Tenant mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const updateDiscountMutation = useMutation({
    mutationFn: async (discountPercent: number) => {
      const currentSettings = typeof tenant?.settings === 'object' && tenant?.settings !== null ? tenant.settings : {};
      const newSettings = { ...currentSettings, discount_percent: discountPercent };
      const { error } = await supabase
        .from('tenants')
        .update({ settings: newSettings, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', tenantId] });
      toast.success('Discount mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour du discount'),
  });

  const updateDedicatedDatabaseMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const currentSettings = typeof tenant?.settings === 'object' && tenant?.settings !== null ? tenant.settings : {};
      const newSettings = { ...currentSettings, dedicated_database: enabled };
      const { error } = await supabase
        .from('tenants')
        .update({ settings: newSettings, updated_at: new Date().toISOString() })
        .eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', tenantId] });
      toast.success('Option database dédiée mise à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const addPaymentMethodMutation = useMutation({
    mutationFn: async () => {
      let type = '';
      let crypto_wallet_address: string | undefined;
      let crypto_network: string | undefined;
      
      switch (newPaymentType) {
        case 'card':
          type = 'stripe_card';
          break;
        case 'sepa':
          type = 'stripe_sepa';
          break;
        case 'crypto':
          type = 'crypto_usdc';
          crypto_wallet_address = newPaymentWallet;
          crypto_network = newPaymentNetwork;
          break;
      }

      const { error } = await supabase
        .from('tenant_payment_methods')
        .insert({
          tenant_id: tenantId,
          type,
          label: newPaymentLabel.trim(),
          crypto_wallet_address,
          crypto_network,
          is_active: true,
          is_default: paymentMethods?.length === 0,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-payment-methods', tenantId] });
      toast.success('Moyen de paiement ajouté');
      setShowAddPaymentMethod(false);
      setNewPaymentLabel('');
      setNewPaymentWallet('');
      setNewPaymentNetwork('ethereum');
    },
    onError: () => toast.error('Erreur lors de l\'ajout'),
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!tenant) return <div className="p-8 text-center"><p className="text-muted-foreground">Tenant non trouvé</p><Button variant="link" onClick={() => navigate('/admin/tenants')}>Retour</Button></div>;

  const capabilities = tenant.capabilities || {};
  const overrides = tenant.capability_overrides || {};
  const tenantSettings = typeof tenant.settings === 'object' && tenant.settings !== null ? tenant.settings as Record<string, any> : {};
  const discount = tenantSettings.discount_percent || 0;

  return (
    <div className="p-8">
      {/* Header */}
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview"><Building2 className="w-4 h-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Utilisateurs ({(erpUsers?.length || 0) + (proCustomers?.length || 0)})</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="w-4 h-4 mr-2" />Billing</TabsTrigger>
          <TabsTrigger value="analytics"><Activity className="w-4 h-4 mr-2" />Analytics</TabsTrigger>
          <TabsTrigger value="capabilities"><Shield className="w-4 h-4 mr-2" />Capabilities</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />Paramètres</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
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
                  <div><p className="text-muted-foreground">Plan</p><p className="font-medium">{tenant.plan_code || 'Aucun'}</p></div>
                  <div><p className="text-muted-foreground">Version</p><p className="font-medium">{tenant.plan_version || '-'}</p></div>
                  <div><p className="text-muted-foreground">Utilisateurs ERP</p><p className="font-medium">{erpUsers?.length || 0}</p></div>
                  <div><p className="text-muted-foreground">Clients Pro</p><p className="font-medium">{proCustomers?.length || 0}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Changer le plan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Select 
                  value={selectedPlanCode ?? tenant.plan_code ?? ''} 
                  onValueChange={setSelectedPlanCode} 
                  disabled={!can('canAssignPlan')}
                >
                  <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
                  <SelectContent>
                    {plans?.map((p) => <SelectItem key={p.code} value={p.code}>{p.name} — {p.base_price_monthly}€/mois</SelectItem>)}
                  </SelectContent>
                </Select>
                {selectedPlanCode && selectedPlanCode !== tenant.plan_code && (
                  <Button 
                    onClick={() => assignPlanMutation.mutate(selectedPlanCode)}
                    disabled={assignPlanMutation.isPending}
                    className="w-full"
                  >
                    {assignPlanMutation.isPending ? 'Enregistrement...' : 'Enregistrer le plan'}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="space-y-6">
            {/* ERP Users */}
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
                      <TableHead>Owner</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>
                    ) : erpUsers?.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Aucun utilisateur</TableCell></TableRow>
                    ) : (
                      erpUsers?.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="font-medium">
                              {user.first_name || user.last_name 
                                ? `${user.first_name || ''} ${user.last_name || ''}`.trim() 
                                : 'Nom non renseigné'}
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Select 
                              value={user.role} 
                              onValueChange={(r) => updateUserRoleMutation.mutate({ id: user.id, role: r as 'admin' | 'staff' | 'viewer' })}
                              disabled={!can('canChangeUserRole') || user.is_owner}
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
                            {user.is_owner && <Badge variant="outline">Owner</Badge>}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem disabled={!can('canResetPassword')}>Reset password</DropdownMenuItem>
                                <DropdownMenuItem disabled={!can('canResendEmail')}>Renvoyer email</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive" disabled={!can('canDeleteUser') || user.is_owner}>Supprimer</DropdownMenuItem>
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

            {/* Pro Customers (wholesale) */}
            <Card>
              <CardHeader>
                <CardTitle>Clients Pro (Wholesale)</CardTitle>
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

        {/* Billing Tab */}
        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Subscription Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Abonnement</CardTitle>
                    <CardDescription>
                      {subscription?.status === 'trialing' && subscription?.trial_ends_at && (
                        <span className="text-blue-600">
                          Essai jusqu'au {format(new Date(subscription.trial_ends_at), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {subscription?.status && (
                    <Badge className={
                      subscription.status === 'active' ? 'bg-green-500 text-white' :
                      subscription.status === 'trialing' ? 'bg-blue-500 text-white' :
                      subscription.status === 'past_due' ? 'bg-amber-500 text-white' :
                      'bg-gray-500 text-white'
                    }>
                      {subscription.status === 'active' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {subscription.status === 'trialing' && <Clock className="w-3 h-3 mr-1" />}
                      {subscription.status === 'past_due' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {subscription.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {subscription ? (
                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <p className="font-medium">{subscription.plan_code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Montant mensuel</p>
                      <p className="font-medium">
                        {subscription.monthly_total?.toLocaleString('fr-FR') || 0}€
                        {subscription.discount_percent > 0 && (
                          <span className="text-green-600 text-sm ml-1">(-{subscription.discount_percent}%)</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Prochaine facturation</p>
                      <p className="font-medium">
                        {subscription.current_period_end 
                          ? format(new Date(subscription.current_period_end), 'dd MMM yyyy', { locale: fr })
                          : '-'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Méthode de paiement</p>
                      <p className="font-medium">
                        {paymentMethods?.find(pm => pm.is_default)?.label || 'Non configuré'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun abonnement configuré</p>
                    <Button variant="outline" className="mt-4">Créer un abonnement</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Moyens de paiement</CardTitle>
                  <Button size="sm" onClick={() => setShowAddPaymentMethod(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {paymentMethods?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Aucun moyen de paiement configuré</p>
                ) : (
                  <div className="space-y-2">
                    {paymentMethods?.map(pm => (
                      <div key={pm.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {pm.type.startsWith('crypto') ? <Wallet className="w-5 h-5 text-muted-foreground" /> : pm.type === 'stripe_sepa' ? <Building2 className="w-5 h-5 text-muted-foreground" /> : <CreditCard className="w-5 h-5 text-muted-foreground" />}
                          <div>
                            <p className="font-medium">{pm.label}</p>
                            <p className="text-xs text-muted-foreground">{pm.type}{pm.crypto_network && ` (${pm.crypto_network})`}</p>
                          </div>
                        </div>
                        {pm.is_default && <Badge variant="outline">Par défaut</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoices */}
            <Card>
              <CardHeader>
                <CardTitle>Factures récentes</CardTitle>
              </CardHeader>
              <CardContent>
                {tenantInvoices?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Aucune facture</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Numéro</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantInvoices?.map(invoice => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                          <TableCell>{format(new Date(invoice.issue_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-medium">{invoice.total?.toLocaleString('fr-FR')}€</TableCell>
                          <TableCell>
                            <Badge variant={
                              invoice.status === 'paid' ? 'default' :
                              invoice.status === 'pending' ? 'outline' :
                              invoice.status === 'overdue' ? 'destructive' :
                              'secondary'
                            }>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {invoice.pdf_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Produits actifs</CardTitle>
                  <Package className="w-4 h-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{analytics?.productsCount || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Valeur stock</CardTitle>
                  <Boxes className="w-4 h-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{(analytics?.stockValue || 0).toLocaleString('fr-FR')}€</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Commandes totales</CardTitle>
                  <ShoppingCart className="w-4 h-4 text-green-500" />
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
                  <Euro className="w-4 h-4 text-emerald-500" />
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
                  <UserCheck className="w-5 h-5 text-blue-500" />
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

        {/* Capabilities Tab */}
        <TabsContent value="capabilities">
          <Card>
            <CardHeader>
              <CardTitle>Capabilities</CardTitle>
              <CardDescription>Plan: {tenant.plan_code || 'Aucun'} v{tenant.plan_version || '-'}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Capability</TableHead>
                    <TableHead>Valeur plan</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead>Effectif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(capabilities).map(([key, value]) => {
                    const override = overrides[key];
                    const hasOverride = override !== undefined;
                    const effective = hasOverride ? override : value;
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-mono text-sm">{key}</TableCell>
                        <TableCell>
                          {typeof value === 'boolean' ? (
                            <Badge variant={value ? 'default' : 'secondary'}>{value ? '✓' : '✗'}</Badge>
                          ) : Array.isArray(value) ? (
                            <code className="text-xs bg-muted px-1 rounded">{value.length} items</code>
                          ) : (
                            <span>{String(value)}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasOverride ? (
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

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Informations générales</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div><Label>Nom</Label><Input defaultValue={tenant.name} disabled={!can('canEditTenant')} /></div>
                  <div><Label>Slug</Label><Input value={tenant.slug} disabled /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Facturation</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Discount (%)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        defaultValue={discount}
                        disabled={!can('canEditTenant')}
                        id="discount-input"
                        className="w-24"
                      />
                      <Button 
                        variant="outline"
                        disabled={!can('canEditTenant') || updateDiscountMutation.isPending}
                        onClick={() => {
                          const input = document.getElementById('discount-input') as HTMLInputElement;
                          const newDiscount = parseInt(input.value) || 0;
                          updateDiscountMutation.mutate(newDiscount);
                        }}
                      >
                        {updateDiscountMutation.isPending ? 'Saving...' : 'Sauvegarder'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Réduction appliquée sur le prix du plan</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Database dédiée</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <Switch
                        checked={tenantSettings.dedicated_database || false}
                        onCheckedChange={(checked) => updateDedicatedDatabaseMutation.mutate(checked)}
                        disabled={!can('canEditTenant') || tenant.plan_code !== 'ENTERPRISE'}
                      />
                      <span className="text-sm">
                        {tenantSettings.dedicated_database ? 'Activé' : 'Désactivé'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {tenant.plan_code === 'ENTERPRISE' 
                        ? 'Disponible pour ce plan Enterprise' 
                        : 'Réservé au plan Enterprise'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Zone de danger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Suspendre le tenant</p>
                    <p className="text-sm text-muted-foreground">Le tenant ne pourra plus accéder à la plateforme</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="text-amber-600 border-amber-600"
                    disabled={!can('canSuspendTenant') || tenant.status === 'suspended'}
                    onClick={() => updateTenantMutation.mutate({ status: 'suspended' })}
                  >
                    {tenant.status === 'suspended' ? 'Déjà suspendu' : 'Suspendre'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Payment Method Dialog */}
      <Dialog open={showAddPaymentMethod} onOpenChange={setShowAddPaymentMethod}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un moyen de paiement</DialogTitle>
            <DialogDescription>Configurer un nouveau moyen de paiement pour ce tenant</DialogDescription>
          </DialogHeader>
          
          <Tabs value={newPaymentType} onValueChange={(v) => setNewPaymentType(v as 'card' | 'sepa' | 'crypto')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="card">Carte</TabsTrigger>
              <TabsTrigger value="sepa">SEPA</TabsTrigger>
              <TabsTrigger value="crypto">Crypto</TabsTrigger>
            </TabsList>

            <TabsContent value="card" className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Visa, Mastercard, American Express</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-card-label">Libellé</Label>
                <Input id="admin-card-label" placeholder="Carte principale" value={newPaymentLabel} onChange={(e) => setNewPaymentLabel(e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="sepa" className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Prélèvement SEPA</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-sepa-label">Libellé</Label>
                <Input id="admin-sepa-label" placeholder="Compte principal" value={newPaymentLabel} onChange={(e) => setNewPaymentLabel(e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="crypto" className="space-y-4 pt-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Wallet className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Stablecoins USDC / USDT</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-crypto-label">Libellé</Label>
                <Input id="admin-crypto-label" placeholder="Wallet crypto" value={newPaymentLabel} onChange={(e) => setNewPaymentLabel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-wallet">Adresse wallet</Label>
                <Input id="admin-wallet" placeholder="0x..." value={newPaymentWallet} onChange={(e) => setNewPaymentWallet(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Réseau</Label>
                <Select value={newPaymentNetwork} onValueChange={setNewPaymentNetwork}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethereum">Ethereum (ERC-20)</SelectItem>
                    <SelectItem value="polygon">Polygon</SelectItem>
                    <SelectItem value="arbitrum">Arbitrum</SelectItem>
                    <SelectItem value="base">Base</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setShowAddPaymentMethod(false)}>Annuler</Button>
            <Button 
              onClick={() => addPaymentMethodMutation.mutate()} 
              disabled={!newPaymentLabel.trim() || addPaymentMethodMutation.isPending || (newPaymentType === 'crypto' && !newPaymentWallet.trim())}
            >
              {addPaymentMethodMutation.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
