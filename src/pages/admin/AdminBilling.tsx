import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  CreditCard, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  FileText,
  Download,
  Search,
  Filter,
  Building2,
  ArrowUpRight,
  Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SUBSCRIPTION_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
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

export function AdminBilling() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');

  // Fetch all subscriptions with tenant info
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_subscriptions')
        .select(`
          *,
          tenants!inner (
            id,
            name,
            slug,
            status
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all invoices
  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['admin-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_invoices')
        .select(`
          *,
          tenants!inner (
            id,
            name,
            slug
          )
        `)
        .order('issue_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch plans for reference
  const { data: plans } = useQuery({
    queryKey: ['sillon-plans'],
    queryFn: async () => {
      const { data } = await supabase.from('sillon_plans').select('code, name, base_price_monthly');
      return data || [];
    },
  });

  // Calculate metrics
  const activeSubscriptions = subscriptions?.filter(s => s.status === 'active') || [];
  const trialingSubscriptions = subscriptions?.filter(s => s.status === 'trialing') || [];
  const pastDueSubscriptions = subscriptions?.filter(s => s.status === 'past_due' || s.status === 'unpaid') || [];

  const mrr = activeSubscriptions.reduce((sum, s) => sum + (Number(s.monthly_total) || 0), 0);
  const arr = mrr * 12;

  const pendingInvoices = invoices?.filter(i => i.status === 'pending' || i.status === 'overdue') || [];
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + (Number(i.amount_due) || 0), 0);

  const paidThisMonth = invoices?.filter(i => {
    if (i.status !== 'paid' || !i.paid_at) return false;
    const paidDate = new Date(i.paid_at);
    const now = new Date();
    return paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear();
  }) || [];
  const collectedThisMonth = paidThisMonth.reduce((sum, i) => sum + (Number(i.total) || 0), 0);

  // Filter subscriptions
  const filteredSubscriptions = subscriptions?.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return s.tenants?.name?.toLowerCase().includes(searchLower) ||
             s.plan_code?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  // Filter invoices
  const filteredInvoices = invoices?.filter(i => {
    if (invoiceStatusFilter !== 'all' && i.status !== invoiceStatusFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return i.tenants?.name?.toLowerCase().includes(searchLower) ||
             i.invoice_number?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  // Payment method distribution
  const paymentMethodCounts = subscriptions?.reduce((acc, s) => {
    const method = s.payment_method_type || 'none';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Gestion des abonnements et factures</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR</CardTitle>
            <CreditCard className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{mrr.toLocaleString('fr-FR')}€</div>
            <p className="text-xs text-muted-foreground mt-1">ARR: {arr.toLocaleString('fr-FR')}€</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abonnements actifs</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeSubscriptions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {trialingSubscriptions.length} en essai
            </p>
          </CardContent>
        </Card>

        <Card className={pendingAmount > 0 ? 'border-amber-500/50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En attente</CardTitle>
            <Clock className={`w-4 h-4 ${pendingAmount > 0 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingAmount.toLocaleString('fr-FR')}€</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingInvoices.length} facture(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Encaissé ce mois</CardTitle>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{collectedThisMonth.toLocaleString('fr-FR')}€</div>
            <p className="text-xs text-muted-foreground mt-1">
              {paidThisMonth.length} paiement(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {pastDueSubscriptions.length > 0 && (
        <Card className="border-red-500/50 bg-red-50/50 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              {pastDueSubscriptions.length} abonnement(s) en retard de paiement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pastDueSubscriptions.slice(0, 5).map(s => (
                <Badge 
                  key={s.id} 
                  variant="outline" 
                  className="cursor-pointer border-red-300 hover:bg-red-100"
                  onClick={() => navigate(`/admin/tenants/${s.tenant_id}`)}
                >
                  {s.tenants?.name}
                </Badge>
              ))}
              {pastDueSubscriptions.length > 5 && (
                <Badge variant="secondary">+{pastDueSubscriptions.length - 5} autres</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="subscriptions">
        <TabsList className="mb-6">
          <TabsTrigger value="subscriptions">Abonnements ({subscriptions?.length || 0})</TabsTrigger>
          <TabsTrigger value="invoices">Factures ({invoices?.length || 0})</TabsTrigger>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-64 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un tenant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="trialing">En essai</SelectItem>
                <SelectItem value="past_due">En retard</SelectItem>
                <SelectItem value="canceled">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Méthode</TableHead>
                    <TableHead>Prochaine facture</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptionsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}><Skeleton className="h-10" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredSubscriptions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun abonnement trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSubscriptions?.map((sub) => {
                      const statusConfig = SUBSCRIPTION_STATUS_CONFIG[sub.status];
                      const StatusIcon = statusConfig?.icon || AlertCircle;
                      const planName = plans?.find(p => p.code === sub.plan_code)?.name || sub.plan_code;
                      
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div 
                              className="font-medium cursor-pointer hover:underline"
                              onClick={() => navigate(`/admin/tenants/${sub.tenant_id}`)}
                            >
                              {sub.tenants?.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{planName}</Badge>
                            {sub.discount_percent > 0 && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                -{sub.discount_percent}%
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig?.color || 'bg-gray-500'} text-white`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusConfig?.label || sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {sub.monthly_total?.toLocaleString('fr-FR') || 0}€/mois
                          </TableCell>
                          <TableCell>
                            {sub.payment_method_type === 'stripe_card' && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                            {sub.payment_method_type === 'stripe_sepa' && <Building2 className="w-4 h-4 text-muted-foreground" />}
                            {sub.payment_method_type?.startsWith('crypto') && <Wallet className="w-4 h-4 text-muted-foreground" />}
                            {!sub.payment_method_type && <span className="text-muted-foreground text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {sub.current_period_end 
                              ? format(new Date(sub.current_period_end), 'dd/MM/yyyy')
                              : '—'
                            }
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/admin/tenants/${sub.tenant_id}`)}
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-64 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une facture..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="paid">Payées</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}><Skeleton className="h-10" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredInvoices?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucune facture trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices?.map((invoice) => {
                      const statusConfig = INVOICE_STATUS_CONFIG[invoice.status];
                      const isOverdue = invoice.status === 'pending' && invoice.due_date && new Date(invoice.due_date) < new Date();
                      
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                          <TableCell>
                            <div 
                              className="cursor-pointer hover:underline"
                              onClick={() => navigate(`/admin/tenants/${invoice.tenant_id}`)}
                            >
                              {invoice.tenants?.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(invoice.issue_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {invoice.total?.toLocaleString('fr-FR')}€
                          </TableCell>
                          <TableCell>
                            <Badge variant={isOverdue ? 'destructive' : statusConfig?.variant || 'secondary'}>
                              {isOverdue ? 'En retard' : statusConfig?.label || invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {invoice.due_date 
                              ? format(new Date(invoice.due_date), 'dd/MM/yyyy')
                              : '—'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {invoice.pdf_url && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer">
                                    <Download className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/admin/tenants/${invoice.tenant_id}`)}
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue by Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Revenus par plan</CardTitle>
                <CardDescription>Distribution du MRR</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plans?.map(plan => {
                    const planSubs = activeSubscriptions.filter(s => s.plan_code === plan.code);
                    const planMrr = planSubs.reduce((sum, s) => sum + (Number(s.monthly_total) || 0), 0);
                    const pct = mrr > 0 ? Math.round((planMrr / mrr) * 100) : 0;
                    
                    if (planSubs.length === 0) return null;
                    
                    return (
                      <div key={plan.code} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{plan.name}</span>
                          <span className="text-muted-foreground">{planSubs.length} tenants</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-20 text-right">
                            {planMrr.toLocaleString('fr-FR')}€
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle>Méthodes de paiement</CardTitle>
                <CardDescription>Distribution par type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(paymentMethodCounts).map(([method, count]) => {
                    const total = Object.values(paymentMethodCounts).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    
                    const methodLabels: Record<string, string> = {
                      stripe_card: 'Carte bancaire',
                      stripe_sepa: 'Prélèvement SEPA',
                      crypto_usdc: 'USDC',
                      crypto_usdt: 'USDT',
                      bank_transfer: 'Virement',
                      manual: 'Manuel',
                      none: 'Non configuré',
                    };
                    
                    return (
                      <div key={method} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {method === 'stripe_card' && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                          {method === 'stripe_sepa' && <Building2 className="w-4 h-4 text-muted-foreground" />}
                          {method.startsWith('crypto') && <Wallet className="w-4 h-4 text-muted-foreground" />}
                          {(method === 'none' || method === 'manual' || method === 'bank_transfer') && <FileText className="w-4 h-4 text-muted-foreground" />}
                          <span className="text-sm">{methodLabels[method] || method}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{count}</span>
                          <Badge variant="outline">{pct}%</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <CardTitle>Statut des abonnements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(SUBSCRIPTION_STATUS_CONFIG).map(([status, config]) => {
                    const count = subscriptions?.filter(s => s.status === status).length || 0;
                    if (count === 0) return null;
                    
                    const StatusIcon = config.icon;
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${status === 'active' ? 'text-green-500' : status === 'trialing' ? 'text-blue-500' : 'text-amber-500'}`} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Trials Ending Soon */}
            <Card>
              <CardHeader>
                <CardTitle>Essais se terminant bientôt</CardTitle>
                <CardDescription>Dans les 7 prochains jours</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const sevenDaysFromNow = new Date();
                  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                  
                  const endingSoon = trialingSubscriptions.filter(s => {
                    if (!s.trial_ends_at) return false;
                    const trialEnd = new Date(s.trial_ends_at);
                    return trialEnd <= sevenDaysFromNow && trialEnd > new Date();
                  });
                  
                  if (endingSoon.length === 0) {
                    return <p className="text-sm text-muted-foreground">Aucun essai ne se termine bientôt</p>;
                  }
                  
                  return (
                    <div className="space-y-2">
                      {endingSoon.map(sub => {
                        const daysLeft = Math.ceil((new Date(sub.trial_ends_at!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <div 
                            key={sub.id} 
                            className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/admin/tenants/${sub.tenant_id}`)}
                          >
                            <span className="text-sm font-medium">{sub.tenants?.name}</span>
                            <Badge variant={daysLeft <= 2 ? 'destructive' : 'secondary'}>
                              {daysLeft}j restants
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
