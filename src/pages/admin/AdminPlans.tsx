import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Check, X, Database, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSillonAdmin } from '@/hooks/useSillonAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

const CAPABILITIES_SCHEMA: Record<string, { label: string; type: string; category: string; options?: string[] }> = {
  purchase_orders: { label: 'Commandes fournisseur', type: 'boolean', category: 'Achats & Stock' },
  goods_receipts: { label: 'Réceptions marchandises', type: 'boolean', category: 'Achats & Stock' },
  partial_receipts: { label: 'Réceptions partielles', type: 'boolean', category: 'Achats & Stock' },
  supplier_invoices: { label: 'Factures fournisseur', type: 'boolean', category: 'Achats & Stock' },
  import_vat_tracking: { label: 'Suivi TVA import', type: 'boolean', category: 'Achats & Stock' },
  multi_currency_purchase: { label: 'Achats multi-devises', type: 'boolean', category: 'Achats & Stock' },
  supplier_fx_override: { label: 'Override taux de change', type: 'boolean', category: 'Achats & Stock' },
  landed_cost_methods: { label: 'Méthodes coûts landed', type: 'array', options: ['prorata_value', 'prorata_weight', 'prorata_qty', 'fixed_unit'], category: 'Achats & Stock' },
  stock_lots_tracking: { label: 'Suivi lots stock', type: 'boolean', category: 'Achats & Stock' },
  consignment_basic: { label: 'Consignment basique', type: 'boolean', category: 'Consignment' },
  consignment_advanced: { label: 'Consignment avancé', type: 'boolean', category: 'Consignment' },
  consignment_settlement: { label: 'Règlement consignment', type: 'boolean', category: 'Consignment' },
  basic_exports: { label: 'Exports basiques', type: 'boolean', category: 'Exports & Analytics' },
  purchase_analytics: { label: 'Analytics achats', type: 'boolean', category: 'Exports & Analytics' },
  fx_exposure_dashboard: { label: 'Dashboard exposition FX', type: 'boolean', category: 'Exports & Analytics' },
  custom_accounting_export: { label: 'Export comptable custom', type: 'boolean', category: 'Exports & Analytics' },
  margin_analysis_advanced: { label: 'Analyse marge avancée', type: 'boolean', category: 'Exports & Analytics' },
  replenishment_suggestions: { label: 'Suggestions réappro', type: 'boolean', category: 'Automation' },
  auto_replenishment: { label: 'Réappro automatique', type: 'boolean', category: 'Automation' },
  auto_fx_alerts: { label: 'Alertes FX auto', type: 'boolean', category: 'Automation' },
  max_portal_customers: { label: 'Max clients portail', type: 'number', category: 'Limites' },
  max_users: { label: 'Max utilisateurs', type: 'number', category: 'Limites' },
  max_products: { label: 'Max produits', type: 'number', category: 'Limites' },
  api_access: { label: 'Accès API', type: 'boolean', category: 'Add-ons' },
  pos_access: { label: 'Accès POS', type: 'boolean', category: 'Add-ons' },
  advisor_access: { label: 'Accès Advisor', type: 'boolean', category: 'Add-ons' },
  dedicated_database: { label: 'Database dédiée', type: 'boolean', category: 'Enterprise' },
};

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  base_price_monthly: number;
  billing_type: string;
  variable_rate: number | null;
  variable_cap: number | null;
  capabilities: Record<string, any>;
  is_active: boolean;
  is_public: boolean;
  display_order: number;
  version: string;
}

interface Addon {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  capability_key: string;
  included_in_plans: string[];
  is_active: boolean;
}

export function AdminPlans() {
  const queryClient = useQueryClient();
  const { can } = useSillonAdmin();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [editedCapabilities, setEditedCapabilities] = useState<Record<string, any>>({});

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['sillon-plans-all'],
    queryFn: async () => {
      const { data } = await supabase.from('sillon_plans').select('*').order('display_order');
      return (data || []) as Plan[];
    },
  });

  const { data: addons, isLoading: addonsLoading } = useQuery({
    queryKey: ['sillon-addons'],
    queryFn: async () => {
      const { data } = await supabase.from('sillon_addons').select('*').order('display_order');
      return (data || []) as Addon[];
    },
  });

  const { data: tenantCounts } = useQuery({
    queryKey: ['plan-tenant-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('plan_code');
      const counts: Record<string, number> = {};
      data?.forEach((t) => { counts[t.plan_code || 'NONE'] = (counts[t.plan_code || 'NONE'] || 0) + 1; });
      return counts;
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (plan: Partial<Plan> & { id: string }) => {
      const { id, billing_type, ...updates } = plan;
      const updateData: any = { ...updates, updated_at: new Date().toISOString() };
      if (billing_type) updateData.billing_type = billing_type as 'fixed' | 'hybrid' | 'variable';
      const { error } = await supabase.from('sillon_plans').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sillon-plans-all'] });
      toast.success('Plan mis à jour');
      setEditingPlan(null);
      setEditedCapabilities({});
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const updateAddonMutation = useMutation({
    mutationFn: async (addon: Partial<Addon> & { id: string }) => {
      const { id, ...updates } = addon;
      const { error } = await supabase.from('sillon_addons').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sillon-addons'] });
      toast.success('Add-on mis à jour');
      setEditingAddon(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const openPlanEditor = (plan: Plan) => {
    setEditingPlan(plan);
    setEditedCapabilities({ ...plan.capabilities });
  };

  const handleCapabilityChange = (key: string, value: any) => {
    setEditedCapabilities(prev => ({ ...prev, [key]: value }));
  };

  const handleArrayCapabilityToggle = (key: string, option: string, checked: boolean) => {
    setEditedCapabilities(prev => {
      const current = prev[key] || [];
      return { ...prev, [key]: checked ? [...current, option] : current.filter((v: string) => v !== option) };
    });
  };

  const handleSavePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPlan) return;
    const formData = new FormData(e.currentTarget);
    updatePlanMutation.mutate({
      id: editingPlan.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      base_price_monthly: parseFloat(formData.get('price') as string),
      variable_rate: formData.get('variable_rate') ? parseFloat(formData.get('variable_rate') as string) / 100 : null,
      variable_cap: formData.get('variable_cap') ? parseFloat(formData.get('variable_cap') as string) : null,
      is_active: formData.get('is_active') === 'on',
      capabilities: editedCapabilities,
    });
  };

  const capabilitiesByCategory = Object.entries(CAPABILITIES_SCHEMA).reduce((acc, [key, meta]) => {
    if (!acc[meta.category]) acc[meta.category] = [];
    acc[meta.category].push({ key, ...meta });
    return acc;
  }, {} as Record<string, Array<{ key: string; label: string; type: string; options?: string[]; category: string }>>);

  const canEdit = can('canEditPlans');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Plans & Pricing</h1>
        <p className="text-muted-foreground">Gérer les offres et tarifs</p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="mb-6">
          <TabsTrigger value="plans">Plans ({plans?.length || 0})</TabsTrigger>
          <TabsTrigger value="addons">Add-ons ({addons?.length || 0})</TabsTrigger>
          <TabsTrigger value="compare">Comparaison</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          {plansLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {plans?.map((plan) => (
                <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <div className="flex gap-1">
                        {!plan.is_active && <Badge variant="secondary">Inactif</Badge>}
                        {plan.capabilities?.dedicated_database && (
                          <Badge variant="outline" className="text-purple-600">
                            <Database className="w-3 h-3 mr-1" />DB
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {plan.base_price_monthly}€
                      <span className="text-sm font-normal text-muted-foreground">/mois</span>
                    </div>
                    {plan.billing_type === 'hybrid' && plan.variable_rate && (
                      <p className="text-sm text-muted-foreground mt-1">
                        + {(plan.variable_rate * 100).toFixed(0)}% CA
                        {plan.variable_cap && ` (max ${plan.variable_cap}€)`}
                      </p>
                    )}
                    <Separator className="my-4" />
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tenants</span>
                        <span className="font-medium">{tenantCounts?.[plan.code] || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max users</span>
                        <span className="font-medium">{plan.capabilities?.max_users || '∞'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max produits</span>
                        <span className="font-medium">{plan.capabilities?.max_products || '∞'}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => openPlanEditor(plan)} disabled={!canEdit}>
                      <Edit2 className="w-4 h-4 mr-2" />Modifier
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="addons">
          {addonsLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {addons?.map((addon) => (
                <Card key={addon.id} className={!addon.is_active ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        {addon.name}
                      </CardTitle>
                      {!addon.is_active && <Badge variant="secondary">Inactif</Badge>}
                    </div>
                    <CardDescription>{addon.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      +{addon.price_monthly}€
                      <span className="text-sm font-normal text-muted-foreground">/mois</span>
                    </div>
                    <Separator className="my-3" />
                    <p className="text-sm text-muted-foreground">
                      Capability: <code className="bg-muted px-1 rounded">{addon.capability_key}</code>
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" className="w-full" onClick={() => setEditingAddon(addon)} disabled={!can('canEditAddons')}>
                      <Edit2 className="w-4 h-4 mr-2" />Modifier
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compare">
          <Card>
            <CardHeader>
              <CardTitle>Comparaison des plans</CardTitle>
              <CardDescription>Vue matricielle de toutes les capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-64 sticky left-0 bg-background">Capability</TableHead>
                      {plans?.map(p => (
                        <TableHead key={p.code} className="text-center min-w-24">{p.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(capabilitiesByCategory).map(([category, caps]) => (
                      <React.Fragment key={category}>
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={(plans?.length || 0) + 1} className="font-semibold">{category}</TableCell>
                        </TableRow>
                        {caps.map(cap => (
                          <TableRow key={cap.key}>
                            <TableCell className="sticky left-0 bg-background text-sm">{cap.label}</TableCell>
                            {plans?.map(plan => {
                              const value = plan.capabilities?.[cap.key];
                              return (
                                <TableCell key={plan.code} className="text-center">
                                  {cap.type === 'boolean' ? (
                                    value ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-muted-foreground mx-auto" />
                                  ) : cap.type === 'number' ? (
                                    <span className="text-sm font-medium">{value === 0 ? '∞' : value || '-'}</span>
                                  ) : cap.type === 'array' ? (
                                    <span className="text-xs">{(value || []).length}</span>
                                  ) : String(value || '-')}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => { setEditingPlan(null); setEditedCapabilities({}); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifier le plan {editingPlan?.name}</DialogTitle>
            <DialogDescription>Les modifications affectent les nouveaux tenants.</DialogDescription>
          </DialogHeader>

          {editingPlan && (
            <form onSubmit={handleSavePlan} className="flex-1 overflow-hidden flex flex-col">
              <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="mb-4">
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 pr-4">
                  <TabsContent value="general" className="mt-0">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nom</Label>
                          <Input id="name" name="name" defaultValue={editingPlan.name} />
                        </div>
                        <div className="space-y-2">
                          <Label>Code</Label>
                          <Input value={editingPlan.code} disabled />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" name="description" defaultValue={editingPlan.description || ''} />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <Label>Plan actif</Label>
                        <Switch name="is_active" defaultChecked={editingPlan.is_active} />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="pricing" className="mt-0">
                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="price">Prix mensuel (€)</Label>
                          <Input id="price" name="price" type="number" step="0.01" defaultValue={editingPlan.base_price_monthly} />
                        </div>
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Input value={editingPlan.billing_type} disabled />
                        </div>
                      </div>
                      {editingPlan.billing_type === 'hybrid' && (
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="variable_rate">Taux variable (%)</Label>
                            <Input id="variable_rate" name="variable_rate" type="number" step="0.1" defaultValue={editingPlan.variable_rate ? editingPlan.variable_rate * 100 : ''} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="variable_cap">Plafond (€)</Label>
                            <Input id="variable_cap" name="variable_cap" type="number" defaultValue={editingPlan.variable_cap || ''} />
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="capabilities" className="mt-0">
                    <div className="space-y-6">
                      {Object.entries(capabilitiesByCategory).map(([category, caps]) => (
                        <div key={category} className="space-y-3">
                          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">{category}</h4>
                          <div className="grid gap-3 md:grid-cols-2">
                            {caps.map(cap => (
                              <div key={cap.key} className="flex items-center justify-between p-3 border rounded-lg">
                                <Label className="text-sm cursor-pointer flex-1">{cap.label}</Label>
                                {cap.type === 'boolean' && (
                                  <Switch checked={editedCapabilities[cap.key] ?? false} onCheckedChange={(checked) => handleCapabilityChange(cap.key, checked)} />
                                )}
                                {cap.type === 'number' && (
                                  <Input type="number" className="w-24 text-right" value={editedCapabilities[cap.key] ?? 0} onChange={(e) => handleCapabilityChange(cap.key, parseInt(e.target.value) || 0)} />
                                )}
                                {cap.type === 'array' && cap.options && (
                                  <div className="flex flex-wrap gap-2">
                                    {cap.options.map(opt => (
                                      <label key={opt} className="flex items-center gap-1 text-xs">
                                        <Checkbox checked={(editedCapabilities[cap.key] || []).includes(opt)} onCheckedChange={(checked) => handleArrayCapabilityToggle(cap.key, opt, !!checked)} />
                                        {opt}
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              <DialogFooter className="mt-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => { setEditingPlan(null); setEditedCapabilities({}); }}>Annuler</Button>
                <Button type="submit" disabled={updatePlanMutation.isPending}>{updatePlanMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Addon Dialog */}
      <Dialog open={!!editingAddon} onOpenChange={() => setEditingAddon(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier {editingAddon?.name}</DialogTitle></DialogHeader>
          {editingAddon && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateAddonMutation.mutate({
                id: editingAddon.id,
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                price_monthly: parseFloat(formData.get('price') as string),
                is_active: formData.get('is_active') === 'on',
              });
            }}>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>Nom</Label><Input name="name" defaultValue={editingAddon.name} /></div>
                  <div className="space-y-2"><Label>Prix (€/mois)</Label><Input name="price" type="number" step="0.01" defaultValue={editingAddon.price_monthly} /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Input name="description" defaultValue={editingAddon.description || ''} /></div>
                <div className="space-y-2"><Label>Capability</Label><Input value={editingAddon.capability_key} disabled /></div>
                <div className="flex items-center justify-between p-4 border rounded-lg"><Label>Actif</Label><Switch name="is_active" defaultChecked={editingAddon.is_active} /></div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingAddon(null)}>Annuler</Button>
                <Button type="submit" disabled={updateAddonMutation.isPending}>Enregistrer</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
