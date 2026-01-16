import { useState, useMemo } from "react";
import { Loader2, Shield, ShieldCheck, Eye, UserCog, Pencil, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUsersWithRoles, useUpdateUserRole, useUpdateUserInfo, type UserWithRole } from "@/hooks/useUserRoles";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string; description: string }> = {
  admin: { 
    label: "Administrateur", 
    icon: ShieldCheck, 
    color: "bg-red-500/10 text-red-500 border-red-500/20",
    description: "Accès complet : lecture, création, modification, suppression"
  },
  staff: { 
    label: "Staff", 
    icon: Shield, 
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    description: "Accès étendu : lecture, création, modification"
  },
  viewer: { 
    label: "Viewer", 
    icon: Eye, 
    color: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    description: "Accès en lecture seule"
  },
};

export function UserRolesPage() {
  const { data: users = [], isLoading } = useUsersWithRoles();
  const updateRole = useUpdateUserRole();
  const updateUserInfo = useUpdateUserInfo();
  const { user: currentUser, hasRole } = useAuth();
  const { toast } = useToast();
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  
  // Edit user dialog state
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users;
    return users.filter(u => u.role === roleFilter);
  }, [users, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<AppRole, number> = { admin: 0, staff: 0, viewer: 0 };
    users.forEach(u => counts[u.role]++);
    return counts;
  }, [users]);

  const handleRoleChange = async (userWithRole: UserWithRole, newRole: AppRole) => {
    if (userWithRole.user_id === currentUser?.id) {
      toast({
        title: "Action non autorisée",
        description: "Vous ne pouvez pas modifier votre propre rôle",
        variant: "destructive"
      });
      return;
    }

    setUpdatingUser(userWithRole.user_id);
    try {
      await updateRole.mutateAsync({ userId: userWithRole.user_id, newRole });
      toast({
        title: "Rôle mis à jour",
        description: `${userWithRole.email} est maintenant ${roleConfig[newRole].label}`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rôle",
        variant: "destructive"
      });
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleOpenEditDialog = (userWithRole: UserWithRole) => {
    setEditingUser(userWithRole);
    setEditFirstName(userWithRole.first_name || "");
    setEditLastName(userWithRole.last_name || "");
  };

  const handleSaveUserInfo = async () => {
    if (!editingUser) return;

    try {
      await updateUserInfo.mutateAsync({
        userId: editingUser.user_id,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim()
      });
      toast({
        title: "Utilisateur mis à jour",
        description: "Les informations ont été enregistrées"
      });
      setEditingUser(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'utilisateur",
        variant: "destructive"
      });
    }
  };

  // Check if current user is admin
  if (!hasRole('admin')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Shield className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Accès restreint</h2>
        <p className="text-muted-foreground">
          Seuls les administrateurs peuvent gérer les rôles utilisateurs.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Gestion des rôles
          </h2>
          <p className="text-sm text-muted-foreground">{users.length} utilisateur(s)</p>
        </div>
        
        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center justify-between w-full gap-4">
                  <span>Tous les rôles</span>
                  <Badge variant="secondary" className="text-xs">{users.length}</Badge>
                </div>
              </SelectItem>
              <SelectItem value="admin">
                <div className="flex items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-red-500" />
                    Administrateurs
                  </div>
                  <Badge variant="secondary" className="text-xs">{roleCounts.admin}</Badge>
                </div>
              </SelectItem>
              <SelectItem value="staff">
                <div className="flex items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500" />
                    Staff
                  </div>
                  <Badge variant="secondary" className="text-xs">{roleCounts.staff}</Badge>
                </div>
              </SelectItem>
              <SelectItem value="viewer">
                <div className="flex items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    Viewers
                  </div>
                  <Badge variant="secondary" className="text-xs">{roleCounts.viewer}</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.entries(roleConfig) as [AppRole, typeof roleConfig[AppRole]][]).map(([role, config]) => {
          const Icon = config.icon;
          return (
            <Card 
              key={role} 
              className={`border cursor-pointer transition-all ${roleFilter === role ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </span>
                  <Badge variant="secondary">{roleCounts[role]}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  {config.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">
                Email
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">
                Nom / Prénom
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">
                Rôle actuel
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border">
                Changer le rôle
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-secondary border-b border-border w-[80px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((userWithRole) => {
              const config = roleConfig[userWithRole.role];
              const Icon = config.icon;
              const isCurrentUser = userWithRole.user_id === currentUser?.id;
              const isUpdating = updatingUser === userWithRole.user_id;

              return (
                <tr 
                  key={userWithRole.id} 
                  className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {userWithRole.first_name && userWithRole.last_name 
                          ? `${userWithRole.first_name[0]}${userWithRole.last_name[0]}`.toUpperCase()
                          : userWithRole.email.substring(0, 2).toUpperCase()
                        }
                      </div>
                      <div>
                        <div className="font-medium">
                          {userWithRole.email}
                        </div>
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground">(vous)</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(userWithRole.first_name || userWithRole.last_name) ? (
                      <span className="font-medium">
                        {[userWithRole.first_name, userWithRole.last_name].filter(Boolean).join(' ')}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Non renseigné</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className={config.color}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    {isCurrentUser ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <Select
                        value={userWithRole.role}
                        onValueChange={(value) => handleRoleChange(userWithRole, value as AppRole)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[180px]">
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-red-500" />
                              Administrateur
                            </div>
                          </SelectItem>
                          <SelectItem value="staff">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-blue-500" />
                              Staff
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-gray-500" />
                              Viewer
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEditDialog(userWithRole)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            {roleFilter !== 'all' 
              ? `Aucun utilisateur avec le rôle "${roleConfig[roleFilter].label}"`
              : "Aucun utilisateur trouvé"
            }
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
            <DialogDescription>
              {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                placeholder="Prénom"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Nom"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Annuler
            </Button>
            <Button onClick={handleSaveUserInfo} disabled={updateUserInfo.isPending}>
              {updateUserInfo.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}