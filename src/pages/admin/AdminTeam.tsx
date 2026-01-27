import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, Plus, MoreHorizontal, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSillonAdmin } from '@/hooks/useSillonAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface SillonAdmin {
  id: string;
  user_id: string | null;
  email: string;
  role: string;
  display_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, { label: string; description: string }> = {
  super_admin: { label: 'Super Admin', description: 'Accès total, gestion des admins' },
  admin: { label: 'Admin', description: 'Gestion des tenants et plans' },
  staff: { label: 'Staff', description: 'Support et actions limitées' },
  viewer: { label: 'Viewer', description: 'Lecture seule' },
};

export function AdminTeam() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, adminData } = useSillonAdmin();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<SillonAdmin | null>(null);

  const { data: admins, isLoading } = useQuery({
    queryKey: ['sillon-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sillon_admins')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as SillonAdmin[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'super_admin' | 'admin' | 'staff' | 'viewer' }) => {
      const { error } = await supabase
        .from('sillon_admins')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sillon-admins'] });
      toast.success('Rôle mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('sillon_admins')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sillon-admins'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  });

  const addAdminMutation = useMutation({
    mutationFn: async (data: { email: string; role: 'super_admin' | 'admin' | 'staff' | 'viewer'; display_name?: string }) => {
      const { error } = await supabase.from('sillon_admins').insert({
        email: data.email.toLowerCase().trim(),
        role: data.role,
        display_name: data.display_name || null,
        created_by: adminData?.user_id || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sillon-admins'] });
      toast.success('Admin ajouté');
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Cet email existe déjà');
      } else {
        toast.error('Erreur lors de l\'ajout');
      }
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sillon_admins').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sillon-admins'] });
      toast.success('Admin supprimé');
      setAdminToDelete(null);
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  });

  // Only super_admin can access this page
  if (!isSuperAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold mb-2">Accès restreint</h1>
        <p className="text-muted-foreground">Cette page est réservée aux Super Admins.</p>
      </div>
    );
  }

  // Stats
  const activeAdmins = admins?.filter(a => a.is_active).length || 0;
  const superAdmins = admins?.filter(a => a.role === 'super_admin').length || 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Équipe Sillon</h1>
          <p className="text-muted-foreground">Gérer les administrateurs de la plateforme</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un admin
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admins?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeAdmins}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Super Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{superAdmins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}><Skeleton className="h-12" /></TableCell>
                  </TableRow>
                ))
              ) : admins?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun admin configuré
                  </TableCell>
                </TableRow>
              ) : (
                admins?.map((admin) => {
                  const isCurrentUser = admin.email === adminData?.email;
                  const roleInfo = ROLE_LABELS[admin.role] || { label: admin.role, description: '' };
                  
                  return (
                    <TableRow key={admin.id} className={!admin.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="font-medium">{admin.display_name || admin.email}</div>
                        {admin.display_name && (
                          <div className="text-sm text-muted-foreground">{admin.email}</div>
                        )}
                        {isCurrentUser && (
                          <Badge variant="outline" className="mt-1 text-xs">Vous</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={admin.role}
                          onValueChange={(role) => updateRoleMutation.mutate({ id: admin.id, role: role as 'super_admin' | 'admin' | 'staff' | 'viewer' })}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ROLE_LABELS).map(([value, { label, description }]) => (
                              <SelectItem key={value} value={value}>
                                <div>
                                  <div>{label}</div>
                                  <div className="text-xs text-muted-foreground">{description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={admin.is_active ? 'default' : 'secondary'}>
                          {admin.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {admin.last_login_at 
                          ? format(new Date(admin.last_login_at), 'dd/MM/yyyy HH:mm')
                          : 'Jamais'
                        }
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(admin.created_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>
                        {!isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => toggleActiveMutation.mutate({ 
                                  id: admin.id, 
                                  is_active: !admin.is_active 
                                })}
                              >
                                {admin.is_active ? 'Désactiver' : 'Activer'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setAdminToDelete(admin)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Ajouter un admin
            </DialogTitle>
            <DialogDescription>
              L'admin pourra se connecter avec cet email. Son user_id sera lié automatiquement à la première connexion.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            addAdminMutation.mutate({
              email: formData.get('email') as string,
              role: formData.get('role') as 'super_admin' | 'admin' | 'staff' | 'viewer',
              display_name: formData.get('display_name') as string,
            });
          }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="admin@example.com"
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="display_name">Nom affiché</Label>
                <Input 
                  id="display_name" 
                  name="display_name" 
                  placeholder="Jean Dupont"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle *</Label>
                <Select name="role" defaultValue="viewer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, { label, description }]) => (
                      <SelectItem key={value} value={value}>
                        <div>
                          <div className="font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground">{description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={addAdminMutation.isPending}>
                {addAdminMutation.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!adminToDelete} onOpenChange={() => setAdminToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet admin ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{adminToDelete?.display_name || adminToDelete?.email}</strong> n'aura plus accès au Control Panel.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => adminToDelete && deleteAdminMutation.mutate(adminToDelete.id)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
