import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from './useAuth';
import { toast } from 'sonner';
import { logRoleChange } from './useRoleChangeHistory';

export interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  active: boolean;
  created_at: string;
}

interface RpcUserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  active: boolean;
  created_at: string;
}

export function useUsersWithRoles() {
  const { user, loading } = useAuth();
  const authReady = !loading;
  const userId = user?.id;

  return useQuery({
    queryKey: ['users-with-roles', userId],
    queryFn: async () => {
      // Fetch users from public.users (users.id = auth.uid after M000)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, active, created_at');

      if (usersError) {
        console.error('Error fetching users:', usersError);
        if (usersError.message?.includes('permission denied') || usersError.code === '42501') {
          toast.error('Accès refusé (admin/staff uniquement).');
          throw new Error('Access denied (admin/staff only).');
        }
        toast.error(`Erreur lors du chargement des utilisateurs: ${usersError.message}`);
        throw usersError;
      }

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        toast.error(`Erreur lors du chargement des rôles: ${rolesError.message}`);
        throw rolesError;
      }

      // Create a map of user_id -> role (user_roles.user_id = auth uid = users.id)
      const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      // Create usersMap keyed by users.id
      const usersMap = new Map(users?.map(u => [u.id, { 
        email: u.email, 
        first_name: u.first_name, 
        last_name: u.last_name,
        active: u.active,
        created_at: u.created_at
      }]) || []);

      // Map users with their roles
      return (users || []).map(u => {
        const userInfo = usersMap.get(u.id);
        return {
          id: u.id,
          user_id: u.id,
          email: userInfo?.email || 'Email inconnu',
          first_name: userInfo?.first_name || null,
          last_name: userInfo?.last_name || null,
          role: (rolesMap.get(u.id) || 'viewer') as AppRole,
          active: userInfo?.active ?? true,
          created_at: userInfo?.created_at || new Date().toISOString()
        };
      }) as UserWithRole[];
    },
    enabled: authReady && !!userId,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, newRole, oldRole }: { userId: string; newRole: AppRole; oldRole?: AppRole }) => {
      // Check if user already has a role
      const { data: existingRole, error: fetchError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing role:', fetchError);
        throw fetchError;
      }

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) {
          console.error('Error updating role:', error);
          throw error;
        }
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) {
          console.error('Error inserting role:', error);
          throw error;
        }
      }

      // Log the role change to history
      if (currentUser?.id) {
        try {
          await logRoleChange(userId, currentUser.id, oldRole || null, newRole);
        } catch (logError) {
          console.error('Failed to log role change:', logError);
          // Don't fail the mutation if logging fails
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-change-history'] });
    }
  });
}

export function useDeleteUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    }
  });
}

export function useUpdateUserInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, firstName, lastName }: { userId: string; firstName: string; lastName: string }) => {
      // Check if user exists in the users table by their id (which is the auth user id)
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({ 
            first_name: firstName || null, 
            last_name: lastName || null 
          })
          .eq('id', userId);

        if (error) throw error;
      } else {
        // User doesn't exist in public.users, can't update
        throw new Error('Utilisateur non trouvé dans la base de données');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    }
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, active }: { userId: string; active: boolean }) => {
      const { error } = await supabase
        .from('users')
        .update({ active })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    }
  });
}
