import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Shield, Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSillonAdmin } from '@/hooks/useSillonAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface SillonAdmin {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export function AdminTeam() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, adminData } = useSillonAdmin();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [deleteAdmin, setDeleteAdmin] = useState<SillonAdmin | null>(null);

  const { data: admins, isLoading } = useQuery({
    queryKey: ['sillon-admins'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sillon_admins').select('*').order('created_at');
      if (error) throw error;
      return data as SillonAdmin[];
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: 'super_admin' | 'admin' | 'staff' | 'viewer' }) => {
      const { error } = await supabase.from('sillon_admins').update({ role }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sillon-admins'] }); toast.success('Rôle mis à jour'); },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('sillon_admins').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sillon-admins'] }); toast.success('Statut mis à jour'); },
  });

  const addAdminMutation = useMutation({
    mutationFn: async (data: { email: string; role: 'super_admin' | 'admin' | 'staff' | 'viewer'; display_name: string }) => {
      const { error } = await supabase.from('sillon_admins').insert([{ 
        email: data.email.toLowerCase(), 
        role: data.role, 
        display_name: data.display_name || null 
      }]);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sillon-admins'] }); toast.success('Admin ajouté'); setShowInviteDialog(false); },
    onError: () => toast.error('Erreur'),
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sillon_admins').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sillon-admins'] }); toast.success('Admin supprimé'); setDeleteAdmin(null); },
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Accès restreint</h1>
        <p className="text-muted-foreground">Seuls les Super Admins peuvent gérer l'équipe.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Équipe Sillon</h1>
          <p className="text-muted-foreground">Gérer les administrateurs</p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}><Plus className="w-4 h-4 mr-2" />Ajouter</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        {['super_admin', 'admin', 'staff', 'viewer'].map(role => (
          <Card key={role}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground capitalize">{role.replace('_', ' ')}s</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{admins?.filter(a => a.role === role && a.is_active).length || 0}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Ajouté le</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>
                ))
              ) : admins?.map((admin) => {
                const isCurrentUser = admin.email === adminData?.email;
                return (
                  <TableRow key={admin.id} className={!admin.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <p className="font-medium">{admin.display_name || admin.email}</p>
                      {admin.display_name && <p className="text-sm text-muted-foreground">{admin.email}</p>}
                    </TableCell>
                    <TableCell>
                      <Select value={admin.role} onValueChange={(r) => updateRoleMutation.mutate({ id: admin.id, role: r as 'super_admin' | 'admin' | 'staff' | 'viewer' })} disabled={isCurrentUser}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge variant={admin.is_active ? 'default' : 'secondary'}>{admin.is_active ? 'Actif' : 'Inactif'}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(admin.created_at), 'dd MMM yyyy', { locale: fr })}</TableCell>
                    <TableCell>
                      {!isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleActiveMutation.mutate({ id: admin.id, is_active: !admin.is_active })}>
                              {admin.is_active ? 'Désactiver' : 'Activer'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteAdmin(admin)}>
                              <Trash2 className="w-4 h-4 mr-2" />Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un admin</DialogTitle>
            <DialogDescription>L'utilisateur aura accès au Control Panel.</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); addAdminMutation.mutate({ email: fd.get('email') as string, role: (fd.get('role') || 'viewer') as 'super_admin' | 'admin' | 'staff' | 'viewer', display_name: fd.get('display_name') as string }); }}>
            <div className="space-y-4">
              <div><Label>Email *</Label><Input name="email" type="email" required /></div>
              <div><Label>Nom</Label><Input name="display_name" /></div>
              <div>
                <Label>Rôle</Label>
                <Select name="role" defaultValue="viewer">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowInviteDialog(false)}>Annuler</Button>
              <Button type="submit">Ajouter</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAdmin} onOpenChange={() => setDeleteAdmin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet admin ?</AlertDialogTitle>
            <AlertDialogDescription>{deleteAdmin?.email} n'aura plus accès.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => deleteAdmin && deleteAdminMutation.mutate(deleteAdmin.id)}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
