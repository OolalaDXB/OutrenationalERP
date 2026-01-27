import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Edit2 } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['sillon-plans-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sillon_plans')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as Plan[];
    },
  });

  const { data: addons, isLoading: addonsLoading } = useQuery({
    queryKey: ['sillon-addons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sillon_addons')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data as Addon[];
    },
  });

  // Count tenants per plan
  const { data: tenantCounts } = useQuery({
    queryKey: ['plan-tenant-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('settings');
      if (error) return {};
      
      const counts: Record<string, number> = {};
      data?.forEach((t: any) => {
        const plan = t.settings?.plan_code || 'NONE';
        counts[plan] = (counts[plan] || 0) + 1;
      });
      return counts;
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (plan: { id: string; name: string; description: string; base_price_monthly: number; is_active: boolean }) => {
      const { id, ...updates } = plan;
      const { error } = await supabase
        .from('sillon_plans')
        .update({ 
          name: updates.name,
          description: updates.description,
          base_price_monthly: updates.base_price_monthly,
          is_active: updates.is_active,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sillon-plans-all'] });
      toast.success('Plan mis à jour');
      setEditingPlan(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const updateAddonMutation = useMutation({
    mutationFn: async (addon: Partial<Addon> & { id: string }) => {
      const { id, ...updates } = addon;
      const { error } = await supabase
        .from('sillon_addons')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sillon-addons'] });
      toast.success('Add-on mis à jour');
      setEditingAddon(null);
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const canEdit = can('canEditPlans');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Plans & Pricing</h1>
        <p className="text-muted-foreground">Gérer les offres et tarifs de la plateforme</p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList className="mb-6">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans">
          {plansLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {plans?.map((plan) => (
                <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {!plan.is_active && <Badge variant="secondary">Inactif</Badge>}
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
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tenants</span>
                        <span className="font-medium">{tenantCounts?.[plan.code] || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-mono text-xs">{plan.version}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setEditingPlan(plan)}
                      disabled={!canEdit}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Addons Tab */}
        <TabsContent value="addons">
          {addonsLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {addons?.map((addon) => (
                <Card key={addon.id} className={!addon.is_active ? 'opacity-60' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{addon.name}</CardTitle>
                      {!addon.is_active && <Badge variant="secondary">Inactif</Badge>}
                    </div>
                    <CardDescription>{addon.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      +{addon.price_monthly}€
                      <span className="text-sm font-normal text-muted-foreground">/mois</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Capability: <code>{addon.capability_key}</code>
                    </p>
                    {addon.included_in_plans.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Inclus dans: {addon.included_in_plans.join(', ')}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setEditingAddon(addon)}
                      disabled={!can('canEditAddons')}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier le plan {editingPlan?.name}</DialogTitle>
            <DialogDescription>
              Les modifications s'appliquent aux nouveaux tenants uniquement.
            </DialogDescription>
          </DialogHeader>
          
          {editingPlan && (
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updatePlanMutation.mutate({
                id: editingPlan.id,
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                base_price_monthly: parseFloat(formData.get('price') as string),
                is_active: formData.get('is_active') === 'on',
              });
            }}>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input id="name" name="name" defaultValue={editingPlan.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Prix mensuel (€)</Label>
                    <Input 
                      id="price" 
                      name="price" 
                      type="number" 
                      step="0.01"
                      defaultValue={editingPlan.base_price_monthly} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" defaultValue={editingPlan.description || ''} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Actif</Label>
                    <p className="text-xs text-muted-foreground">Plan disponible à la souscription</p>
                  </div>
                  <Switch name="is_active" defaultChecked={editingPlan.is_active} />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updatePlanMutation.isPending}>
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Addon Dialog */}
      <Dialog open={!!editingAddon} onOpenChange={() => setEditingAddon(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier {editingAddon?.name}</DialogTitle>
          </DialogHeader>
          
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
                  <div className="space-y-2">
                    <Label htmlFor="addon-name">Nom</Label>
                    <Input id="addon-name" name="name" defaultValue={editingAddon.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addon-price">Prix mensuel (€)</Label>
                    <Input 
                      id="addon-price" 
                      name="price" 
                      type="number" 
                      step="0.01"
                      defaultValue={editingAddon.price_monthly} 
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="addon-description">Description</Label>
                  <Input id="addon-description" name="description" defaultValue={editingAddon.description || ''} />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Actif</Label>
                  <Switch name="is_active" defaultChecked={editingAddon.is_active} />
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setEditingAddon(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={updateAddonMutation.isPending}>
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
