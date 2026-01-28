import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CreditCard, 
  Download, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Wallet,
  Building2,
  FileText,
  ExternalLink,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTenantContext } from '@/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PaymentCardForm } from '@/components/payment/PaymentCardForm';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  trialing: { label: 'Essai', color: 'bg-blue-500', icon: Clock },
  active: { label: 'Actif', color: 'bg-green-500', icon: CheckCircle2 },
  past_due: { label: 'En retard', color: 'bg-amber-500', icon: AlertCircle },
  canceled: { label: 'Annulé', color: 'bg-gray-500', icon: AlertCircle },
  unpaid: { label: 'Impayé', color: 'bg-red-500', icon: AlertCircle },
  paused: { label: 'En pause', color: 'bg-gray-500', icon: Clock },
};

const INVOICE_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  pending: { label: 'En attente', variant: 'outline' },
  paid: { label: 'Payée', variant: 'default' },
  overdue: { label: 'En retard', variant: 'destructive' },
  canceled: { label: 'Annulée', variant: 'secondary' },
  refunded: { label: 'Remboursée', variant: 'outline' },
};

const PAYMENT_METHOD_ICONS: Record<string, any> = {
  stripe_card: CreditCard,
  stripe_sepa: Building2,
  crypto_usdc: Wallet,
  crypto_usdt: Wallet,
  bank_transfer: Building2,
  manual: FileText,
};

// Add Payment Method Dialog Component
interface AddPaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | undefined;
  paymentMethodsCount: number;
  onSuccess: () => void;
}

function AddPaymentMethodDialog({ open, onOpenChange, tenantId, paymentMethodsCount, onSuccess }: AddPaymentMethodDialogProps) {
  const [activeTab, setActiveTab] = useState<'card' | 'sepa' | 'crypto'>('card');
  const [label, setLabel] = useState('');
  const [iban, setIban] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('ethereum');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setLabel('');
    setIban('');
    setWalletAddress('');
    setCryptoNetwork('ethereum');
    setActiveTab('card');
  };

  const handleSubmit = async () => {
    if (!tenantId) return;
    
    let type = '';
    let crypto_wallet_address: string | undefined;
    let crypto_network: string | undefined;
    
    switch (activeTab) {
      case 'card':
        if (!label.trim()) {
          toast.error('Veuillez entrer un libellé');
          return;
        }
        type = 'stripe_card';
        break;
      case 'sepa':
        if (!label.trim() || !iban.trim()) {
          toast.error('Veuillez remplir tous les champs');
          return;
        }
        type = 'stripe_sepa';
        break;
      case 'crypto':
        if (!label.trim() || !walletAddress.trim()) {
          toast.error('Veuillez remplir tous les champs');
          return;
        }
        type = 'crypto_usdc';
        crypto_wallet_address = walletAddress;
        crypto_network = cryptoNetwork;
        break;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('tenant_payment_methods')
        .insert({
          tenant_id: tenantId,
          type,
          label: label.trim(),
          crypto_wallet_address,
          crypto_network,
          is_active: true,
          is_default: paymentMethodsCount === 0,
        } as any);
      
      if (error) throw error;
      
      toast.success('Moyen de paiement ajouté');
      resetForm();
      onSuccess();
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un moyen de paiement</DialogTitle>
          <DialogDescription>
            Choisissez votre méthode de paiement préférée
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'card' | 'sepa' | 'crypto')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="card">Carte</TabsTrigger>
            <TabsTrigger value="sepa">SEPA</TabsTrigger>
            <TabsTrigger value="crypto">Crypto</TabsTrigger>
          </TabsList>

          <TabsContent value="card" className="space-y-4 pt-4">
            {tenantId && (
              <PaymentCardForm
                tenantId={tenantId}
                onSuccess={() => {
                  onSuccess();
                  onOpenChange(false);
                }}
                onCancel={() => onOpenChange(false)}
              />
            )}
          </TabsContent>

          <TabsContent value="sepa" className="space-y-4 pt-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Prélèvement SEPA depuis votre compte bancaire</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sepa-label">Libellé</Label>
              <Input 
                id="sepa-label" 
                placeholder="Compte principal" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input 
                id="iban" 
                placeholder="FR76 1234 5678 9012 3456 7890 123" 
                value={iban} 
                onChange={(e) => setIban(e.target.value)} 
              />
            </div>
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4 pt-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Wallet className="w-5 h-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Stablecoins USDC / USDT</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="crypto-label">Libellé</Label>
              <Input 
                id="crypto-label" 
                placeholder="Mon wallet crypto" 
                value={label} 
                onChange={(e) => setLabel(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet">Adresse wallet</Label>
              <Input 
                id="wallet" 
                placeholder="0x..." 
                value={walletAddress} 
                onChange={(e) => setWalletAddress(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="network">Réseau</Label>
              <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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

        {activeTab !== 'card' && (
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TenantBillingSettings() {
  const tenant = useTenantContext();
  const queryClient = useQueryClient();
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<any>(null);

  // Fetch subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['tenant-subscription', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select('*')
        .eq('tenant_id', tenant?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.id,
  });

  // Fetch payment methods
  const { data: paymentMethods, isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ['tenant-payment-methods', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_payment_methods')
        .select('*')
        .eq('tenant_id', tenant?.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Fetch invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['tenant-invoices', tenant?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_invoices')
        .select('*')
        .eq('tenant_id', tenant?.id)
        .order('issue_date', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.id,
  });

  // Fetch available plans
  const { data: plans } = useQuery({
    queryKey: ['sillon-plans-public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sillon_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('display_order');
      return data || [];
    },
  });

  // Update billing info mutation
  const updateBillingInfoMutation = useMutation({
    mutationFn: async (billingInfo: Record<string, any>) => {
      const { error } = await supabase
        .from('tenant_subscriptions')
        .update({
          billing_name: billingInfo.billing_name,
          billing_email: billingInfo.billing_email,
          billing_address: billingInfo.billing_address,
          vat_number: billingInfo.vat_number,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', tenant?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription', tenant?.id] });
      toast.success('Informations de facturation mises à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  // Set default payment method
  const setDefaultPaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      // Remove default from all
      await supabase
        .from('tenant_payment_methods')
        .update({ is_default: false })
        .eq('tenant_id', tenant?.id);
      
      // Set new default
      const { error } = await supabase
        .from('tenant_payment_methods')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', paymentMethodId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payment-methods', tenant?.id] });
      toast.success('Méthode de paiement par défaut mise à jour');
    },
  });

  // Delete payment method
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const { error } = await supabase
        .from('tenant_payment_methods')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', paymentMethodId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payment-methods', tenant?.id] });
      toast.success('Méthode de paiement supprimée');
      setPaymentMethodToDelete(null);
    },
  });

  // Select/change plan mutation - calls Edge Function via PaymentService
  const selectPlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      console.log('[selectPlanMutation] Starting plan selection:', planCode, 'tenantId:', tenant?.id);
      
      // Get default payment method if available
      const defaultPm = paymentMethods?.find(pm => pm.is_default);
      console.log('[selectPlanMutation] Default payment method:', defaultPm?.stripe_payment_method_id);
      
      // Call the Edge Function via supabase.functions.invoke
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Non authentifié');
      }
      
      const { data, error } = await supabase.functions.invoke('payment-create-subscription', {
        body: {
          tenant_id: tenant?.id,
          plan_code: planCode,
          payment_method_id: defaultPm?.stripe_payment_method_id,
          trial_days: subscription ? 0 : 14,
        },
      });
      
      console.log('[selectPlanMutation] Edge Function response:', { data, error });
      
      if (error) {
        console.error('[selectPlanMutation] Edge Function error:', error);
        throw new Error(error.message || 'Erreur lors de la création de l\'abonnement');
      }
      
      if (data?.error) {
        console.error('[selectPlanMutation] API error:', data.error);
        throw new Error(data.error);
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log('[selectPlanMutation] Success:', data);
      queryClient.invalidateQueries({ queryKey: ['tenant-subscription', tenant?.id] });
      toast.success(subscription ? 'Plan modifié avec succès' : 'Abonnement créé avec essai de 14 jours');
    },
    onError: (error: Error) => {
      console.error('[selectPlanMutation] Error:', error);
      toast.error(error.message || 'Erreur lors du changement de plan');
    },
  });

  if (subscriptionLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const statusConfig = subscription?.status ? STATUS_CONFIG[subscription.status] : null;
  const StatusIcon = statusConfig?.icon || AlertCircle;

  const currentPlan = plans?.find(p => p.code === subscription?.plan_code);
  const trialDaysLeft = subscription?.trial_ends_at 
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Abonnement & Facturation</h1>
        <p className="text-muted-foreground">Gérez votre abonnement et vos moyens de paiement</p>
      </div>

      <Tabs defaultValue="subscription">
        <TabsList>
          <TabsTrigger value="subscription">Abonnement</TabsTrigger>
          <TabsTrigger value="payment">Paiement</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="billing-info">Infos facturation</TabsTrigger>
        </TabsList>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Plan actuel</CardTitle>
                  <CardDescription>
                    {subscription?.status === 'trialing' && trialDaysLeft > 0 && (
                      <span className="text-blue-600">{trialDaysLeft} jours d'essai restants</span>
                    )}
                  </CardDescription>
                </div>
                {statusConfig && (
                  <Badge className={`${statusConfig.color} text-white`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold">{currentPlan?.name || subscription?.plan_code || 'Aucun'}</span>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Prix mensuel</p>
                  <p className="font-medium text-lg">
                    {subscription?.monthly_total?.toLocaleString('fr-FR') || 0}€
                    {subscription?.discount_percent > 0 && (
                      <span className="text-green-600 text-sm ml-2">(-{subscription.discount_percent}%)</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prochaine facturation</p>
                  <p className="font-medium">
                    {subscription?.current_period_end 
                      ? format(new Date(subscription.current_period_end), 'dd MMMM yyyy', { locale: fr })
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Méthode de paiement</p>
                  <p className="font-medium">
                    {paymentMethods?.find(pm => pm.is_default)?.label || 'Non configuré'}
                  </p>
                </div>
              </div>

              {subscription?.addons?.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Add-ons actifs</p>
                    <div className="flex gap-2">
                      {subscription.addons.map((addon: string) => (
                        <Badge key={addon} variant="outline">{addon}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex gap-3">
              <Button variant="outline" onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}>
                Changer de plan
              </Button>
              {subscription?.status === 'active' && (
                <Button variant="ghost" className="text-destructive">
                  Annuler l'abonnement
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Available Plans */}
          <div id="available-plans">
            <h3 className="text-lg font-semibold mb-4">Plans disponibles</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-stretch">
              {plans?.map((plan) => {
                const isCurrent = plan.code === subscription?.plan_code;
                return (
                  <Card key={plan.id} className={`flex flex-col ${isCurrent ? 'border-primary' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        {isCurrent && <Badge>Actuel</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="text-2xl font-bold mb-2">
                        {plan.base_price_monthly}€
                        <span className="text-sm font-normal text-muted-foreground">/mois</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </CardContent>
                    <CardFooter className="mt-auto pt-4">
                      {isCurrent ? (
                        <Badge variant="outline" className="w-full justify-center h-9 flex items-center">Plan actuel</Badge>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          size="sm"
                          onClick={() => selectPlanMutation.mutate(plan.code)}
                          disabled={selectPlanMutation.isPending}
                        >
                          {selectPlanMutation.isPending ? 'Sélection...' : 'Sélectionner'}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Moyens de paiement</CardTitle>
                  <CardDescription>Gérez vos méthodes de paiement</CardDescription>
                </div>
                <Button onClick={() => setShowAddPaymentMethod(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {paymentMethodsLoading ? (
                <Skeleton className="h-24" />
              ) : paymentMethods?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun moyen de paiement configuré</p>
                  <Button variant="link" onClick={() => setShowAddPaymentMethod(true)}>
                    Ajouter un moyen de paiement
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods?.map((pm) => {
                    const Icon = PAYMENT_METHOD_ICONS[pm.type] || CreditCard;
                    return (
                      <div 
                        key={pm.id} 
                        className={`flex items-center justify-between p-4 border rounded-lg ${pm.is_default ? 'border-primary bg-primary/5' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium">{pm.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {pm.type === 'stripe_card' && pm.stripe_card_exp_month && (
                                `Expire ${pm.stripe_card_exp_month}/${pm.stripe_card_exp_year}`
                              )}
                              {pm.type.startsWith('crypto') && pm.crypto_network && (
                                `Réseau: ${pm.crypto_network}`
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pm.is_default ? (
                            <Badge variant="outline">Par défaut</Badge>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setDefaultPaymentMethodMutation.mutate(pm.id)}
                            >
                              Définir par défaut
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive"
                            onClick={() => setPaymentMethodToDelete(pm)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Crypto Payment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Paiement en Stablecoins
              </CardTitle>
              <CardDescription>
                Payez votre abonnement en USDC ou USDT
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">USDC</Badge>
                    <Badge variant="outline">USDT</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Réseaux supportés : Ethereum, Polygon, Base
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setShowAddPaymentMethod(true)}>
                    Configurer
                  </Button>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-1">Avantages</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Pas de frais de conversion</li>
                    <li>• Paiement instantané</li>
                    <li>• Idéal pour les entreprises internationales</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Historique des factures</CardTitle>
              <CardDescription>Consultez et téléchargez vos factures</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <Skeleton className="h-48" />
              ) : invoices?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune facture pour le moment</p>
                </div>
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
                    {invoices?.map((invoice) => {
                      const statusConfig = INVOICE_STATUS_CONFIG[invoice.status];
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            {format(new Date(invoice.issue_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {invoice.total?.toLocaleString('fr-FR')}€
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusConfig?.variant || 'secondary'}>
                              {statusConfig?.label || invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {invoice.pdf_url && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4 mr-1" />
                                    PDF
                                  </a>
                                </Button>
                              )}
                              {invoice.stripe_hosted_invoice_url && invoice.status === 'pending' && (
                                <Button variant="outline" size="sm" asChild>
                                  <a href={invoice.stripe_hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-1" />
                                    Payer
                                  </a>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Info Tab */}
        <TabsContent value="billing-info">
          <Card>
            <CardHeader>
              <CardTitle>Informations de facturation</CardTitle>
              <CardDescription>Ces informations apparaîtront sur vos factures</CardDescription>
            </CardHeader>
            <CardContent>
              <form 
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  updateBillingInfoMutation.mutate({
                    billing_name: formData.get('billing_name'),
                    billing_email: formData.get('billing_email'),
                    vat_number: formData.get('vat_number'),
                    billing_address: {
                      line1: formData.get('address_line1'),
                      line2: formData.get('address_line2'),
                      city: formData.get('city'),
                      postal_code: formData.get('postal_code'),
                      country: formData.get('country'),
                    },
                  });
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="billing_name">Nom / Raison sociale</Label>
                    <Input 
                      id="billing_name" 
                      name="billing_name" 
                      defaultValue={subscription?.billing_name || ''} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_email">Email de facturation</Label>
                    <Input 
                      id="billing_email" 
                      name="billing_email" 
                      type="email"
                      defaultValue={subscription?.billing_email || ''} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vat_number">Numéro de TVA</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="vat_number" 
                      name="vat_number" 
                      placeholder="FR12345678901"
                      defaultValue={subscription?.vat_number || ''} 
                    />
                    {subscription?.vat_validated && (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Validé
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="address_line1">Adresse</Label>
                  <Input 
                    id="address_line1" 
                    name="address_line1" 
                    defaultValue={(subscription?.billing_address as Record<string, any>)?.line1 || ''} 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address_line2">Complément d'adresse</Label>
                  <Input 
                    id="address_line2" 
                    name="address_line2" 
                    defaultValue={(subscription?.billing_address as Record<string, any>)?.line2 || ''} 
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Code postal</Label>
                    <Input 
                      id="postal_code" 
                      name="postal_code" 
                      defaultValue={(subscription?.billing_address as Record<string, any>)?.postal_code || ''} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input 
                      id="city" 
                      name="city" 
                      defaultValue={(subscription?.billing_address as Record<string, any>)?.city || ''} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Pays</Label>
                    <Input 
                      id="country" 
                      name="country" 
                      defaultValue={(subscription?.billing_address as Record<string, any>)?.country || 'France'} 
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateBillingInfoMutation.isPending}>
                    {updateBillingInfoMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Payment Method Dialog */}
      <AddPaymentMethodDialog
        open={showAddPaymentMethod}
        onOpenChange={setShowAddPaymentMethod}
        tenantId={tenant?.id}
        paymentMethodsCount={paymentMethods?.length || 0}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tenant-payment-methods', tenant?.id] });
          setShowAddPaymentMethod(false);
        }}
      />

      {/* Delete Payment Method Confirmation */}
      <AlertDialog open={!!paymentMethodToDelete} onOpenChange={() => setPaymentMethodToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce moyen de paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {paymentMethodToDelete?.label} sera supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => paymentMethodToDelete && deletePaymentMethodMutation.mutate(paymentMethodToDelete.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
