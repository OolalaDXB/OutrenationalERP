import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FileText, Check, X, Eye, MoreHorizontal, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantRequest {
  id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string;
  role: string | null;
  country: string | null;
  estimated_products: string | null;
  estimated_orders_month: string | null;
  message: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export function AdminRequests() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<TenantRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_requests' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TenantRequest[];
    },
  });

  // Helper to create slug from company name
  const createSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  };

  const approveMutation = useMutation({
    mutationFn: async ({ request, notes }: { request: TenantRequest; notes?: string }) => {
      // 1. Create the tenant
      const slug = createSlug(request.company_name);
      
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          name: request.company_name,
          slug: slug,
          status: 'active',
          settings: {
            plan_code: 'STARTER',
            contact_email: request.contact_email,
          },
        })
        .select('id')
        .single();

      if (tenantError) {
        console.error('Error creating tenant:', tenantError);
        throw new Error(`Erreur création tenant: ${tenantError.message}`);
      }

      // 2. Create settings for the tenant
      const { error: settingsError } = await supabase
        .from('settings')
        .insert({
          id: tenant.id, // settings.id = tenant.id (1:1 relationship)
          shop_name: request.company_name,
          shop_email: request.contact_email,
          shop_country: request.country || 'France',
          plan_code: 'STARTER',
        } as any);

      if (settingsError) {
        console.error('Error creating settings:', settingsError);
        // Rollback: delete the tenant
        await supabase.from('tenants').delete().eq('id', tenant.id);
        throw new Error(`Erreur création settings: ${settingsError.message}`);
      }

      // 3. Check if user exists by email
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('auth_user_id')
        .eq('email', request.contact_email)
        .maybeSingle();

      // Note: We can't create tenant_users here without auth.uid() of the user
      // The user will need to sign up/login and be added manually or via an invite flow
      // For now, we just update the request status

      // 4. Update the request status
      const { error: updateError } = await supabase
        .from('tenant_requests' as any)
        .update({
          status: 'approved',
          notes: notes || null,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', request.id);

      if (updateError) throw updateError;

      return { tenantId: tenant.id, slug };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
      toast.success(`Tenant créé avec succès ! Slug: ${data.slug}`);
      setDetailsOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de l\'approbation');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase
        .from('tenant_requests' as any)
        .update({
          status: 'rejected',
          notes: notes || null,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-requests'] });
      toast.success('Demande refusée');
      setDetailsOpen(false);
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error('Erreur lors du refus');
    },
  });

  const handleApprove = (request: TenantRequest) => {
    approveMutation.mutate({ request, notes });
  };

  const handleReject = (request: TenantRequest) => {
    rejectMutation.mutate({ id: request.id, notes });
  };

  const openDetails = (request: TenantRequest) => {
    setSelectedRequest(request);
    setNotes(request.notes || '');
    setDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Refusé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'distributor':
        return <Badge variant="outline">Distributeur</Badge>;
      case 'label':
        return <Badge variant="outline">Label</Badge>;
      case 'record_shop':
        return <Badge variant="outline">Disquaire</Badge>;
      default:
        return <Badge variant="outline">{role || 'N/A'}</Badge>;
    }
  };

  const filteredRequests = requests?.filter((r) => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const pendingCount = requests?.filter((r) => r.status === 'pending').length || 0;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Demandes d'accès</h1>
          <p className="text-muted-foreground">
            Gestion des demandes d'inscription à Sillon
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              <FileText className="w-3 h-3 mr-1" />
              {pendingCount} en attente
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending">
            En attente
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">Approuvées</TabsTrigger>
          <TabsTrigger value="rejected">Refusées</TabsTrigger>
          <TabsTrigger value="all">Toutes</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entreprise</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRequests?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune demande
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.company_name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">{request.contact_name || '—'}</div>
                          <div className="text-xs text-muted-foreground">{request.contact_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(request.role)}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div>{request.estimated_products || '—'} réf.</div>
                          <div className="text-muted-foreground">{request.estimated_orders_month || '—'} cmd/mois</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(request.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetails(request)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            {request.status === 'pending' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleApprove(request)}
                                  className="text-green-600"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Approuver
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleReject(request)}
                                  className="text-destructive"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Refuser
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
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
            <DialogDescription>
              Demande de {selectedRequest?.company_name}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Entreprise</Label>
                  <p className="font-medium">{selectedRequest.company_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Contact</Label>
                  <p className="font-medium">{selectedRequest.contact_name || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedRequest.contact_email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Pays</Label>
                  <p className="font-medium">{selectedRequest.country || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Type d'activité</Label>
                  <p>{getRoleBadge(selectedRequest.role)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>{getStatusBadge(selectedRequest.status)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Références estimées</Label>
                  <p className="font-medium">{selectedRequest.estimated_products || '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Commandes/mois</Label>
                  <p className="font-medium">{selectedRequest.estimated_orders_month || '—'}</p>
                </div>
              </div>

              {selectedRequest.message && (
                <div>
                  <Label className="text-muted-foreground">Message</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedRequest.message}</p>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes internes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajouter des notes..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedRequest?.status === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => selectedRequest && handleReject(selectedRequest)}
                  disabled={rejectMutation.isPending}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="w-4 h-4 mr-2" />
                  Refuser
                </Button>
                <Button
                  onClick={() => selectedRequest && handleApprove(selectedRequest)}
                  disabled={approveMutation.isPending}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approuver
                </Button>
              </>
            )}
            {selectedRequest?.status !== 'pending' && (
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Fermer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
