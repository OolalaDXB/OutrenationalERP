import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, Building2, Users, Settings, Shield, Activity,
  ExternalLink, MoreHorizontal, Mail, KeyRound, Trash2, Plus, Copy, Check
} from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  settings: Record<string, any> | null;
}

interface TenantUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  last_sign_in_at?: string;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  base_price_monthly: number;
}

export function TenantDetail() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = useSillonAdmin();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmAction, setConfirmAction] = useState<{ type: string; data?: any } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['admin-tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
      if (error) throw error;
      return data as Tenant;
    },
    enabled: !!tenantId,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-tenant-users', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from('tenant_users').select('*').eq('tenant_id', tenantId);
      if (error) throw error;
      return data as TenantUser[];
    },
    enabled: !!tenantId,
  });

  const { data: plans } = useQuery({
    queryKey: ['sillon-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sillon_plans').select('*').eq('is_active', true).order('display_order');
      if (error) return [];
      return data as Plan[];
    },
  });

  const assignPlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      // Update settings with new plan_code
      const newSettings = { ...(tenant?.settings || {}), plan_code: planCode };
      const { error } = await supabase
        .from('tenants')
        .update({ settings: newSettings })
        .eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', tenantId] });
      toast.success('Plan assigné');
    },
    onError: () => toast.error('Erreur'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase
        .from('tenants')
        .update({ status })
        .eq('id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant', tenantId] });
      toast.success('Statut mis à jour');
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'admin' | 'staff' | 'viewer' }) => {
      const { error } = await supabase.from('tenant_users').update({ role }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenant-users', tenantId] });
      toast.success('Rôle mis à jour');
    },
  });

  const copyId = () => {
    if (tenant) {
      navigator.clipboard.writeText(tenant.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Tenant non trouvé</p>
        <Button variant="link" onClick={() => navigate('/admin/tenants')}>Retour</Button>
      </div>
    );
  }

  const capabilities = tenant.settings?.capabilities || {};
  const overrides = tenant.settings?.capability_overrides || {};

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/tenants')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>{tenant.status}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{tenant.slug}</code>
              <span>•</span>
              <span>Créé le {format(new Date(tenant.created_at), 'dd MMM yyyy', { locale: fr })}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.open(`/t/${tenant.slug}/`, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Accéder
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyId}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                Copier l'ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {tenant.status === 'active' ? (
                <DropdownMenuItem className="text-amber-600" onClick={() => setConfirmAction({ type: 'suspend' })}>
                  Suspendre
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="text-green-600" onClick={() => updateStatusMutation.mutate('active')}>
                  Réactiver
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview"><Building2 className="w-4 h-4 mr-2" />Overview</TabsTrigger>
          <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />Utilisateurs ({users?.length || 0})</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" />Paramètres</TabsTrigger>
          <TabsTrigger value="capabilities"><Shield className="w-4 h-4 mr-2" />Capabilities</TabsTrigger>
          <TabsTrigger value="activity"><Activity className="w-4 h-4 mr-2" />Activité</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Plan</p><p className="font-medium">{tenant.settings?.plan_code || 'Aucun'}</p></div>
                  <div><p className="text-muted-foreground">Version</p><p className="font-medium">{tenant.settings?.plan_version || '-'}</p></div>
                  <div><p className="text-muted-foreground">Utilisateurs</p><p className="font-medium">{users?.length || 0}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Changer le plan</CardTitle></CardHeader>
              <CardContent>
                <Select value={tenant.settings?.plan_code || ''} onValueChange={(v) => assignPlanMutation.mutate(v)} disabled={!can('canAssignPlan')}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
                  <SelectContent>
                    {plans?.map((p) => <SelectItem key={p.code} value={p.code}>{p.name} — {p.base_price_monthly}€</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card>
            <CardHeader><CardTitle>Utilisateurs</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow><TableCell colSpan={4}><Skeleton className="h-8" /></TableCell></TableRow>
                  ) : users?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{u.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <Select value={u.role} onValueChange={(r) => updateUserRoleMutation.mutate({ id: u.id, role: r as 'admin' | 'staff' | 'viewer' })} disabled={!can('canChangeUserRole')}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{format(new Date(u.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem><KeyRound className="w-4 h-4 mr-2" />Reset password</DropdownMenuItem>
                            <DropdownMenuItem><Mail className="w-4 h-4 mr-2" />Resend email</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" />Supprimer</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>Paramètres</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>Nom</Label><Input defaultValue={tenant.name} disabled={!can('canEditTenant')} /></div>
                <div><Label>Slug</Label><Input value={tenant.slug} disabled /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capabilities */}
        <TabsContent value="capabilities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Capabilities</CardTitle>
                <CardDescription>Plan: {tenant.settings?.plan_code || 'Aucun'}</CardDescription>
              </div>
              {can('canAddOverride') && <Button><Plus className="w-4 h-4 mr-2" />Ajouter override</Button>}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Capability</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead>Effectif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(capabilities).map(([key, value]) => {
                    const override = overrides[key];
                    const effective = override ? (override.enabled ?? override.value ?? value) : value;
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-mono text-sm">{key}</TableCell>
                        <TableCell>
                          {typeof value === 'boolean' ? (
                            <Badge variant={value ? 'default' : 'secondary'}>{value ? '✓' : '✗'}</Badge>
                          ) : String(value)}
                        </TableCell>
                        <TableCell>
                          {override ? <Badge variant="outline" className="text-amber-600">Override</Badge> : '—'}
                        </TableCell>
                        <TableCell>
                          {typeof effective === 'boolean' ? (
                            <Badge variant={effective ? 'default' : 'secondary'}>{effective ? '✓' : '✗'}</Badge>
                          ) : String(effective)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity">
          <Card>
            <CardHeader><CardTitle>Activité</CardTitle></CardHeader>
            <CardContent><p className="text-center py-8 text-muted-foreground">Historique bientôt disponible</p></CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.type === 'suspend' ? 'Suspendre le tenant ?' : 'Confirmer'}</AlertDialogTitle>
            <AlertDialogDescription>Cette action peut être annulée.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmAction?.type === 'suspend') updateStatusMutation.mutate('suspended'); setConfirmAction(null); }}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
