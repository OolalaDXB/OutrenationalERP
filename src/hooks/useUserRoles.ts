import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from './useAuth';
import { toast } from 'sonner';

export interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  created_at: string;
}

interface UserRoleJoin {
  id: string;
  role: AppRole;
  created_at: string;
}

interface UserWithRoleJoin {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  user_roles: UserRoleJoin[];
}

export function useUsersWithRoles() {
  const { user, loading } = useAuth();
  const authReady = !loading;
  const userId = user?.id;

  return useQuery({
    // Include user ID in cache key to prevent caching empty results from pre-auth state
    queryKey: ['users-with-roles', userId],
    queryFn: async () => {
      // Single query: public.users joined with user_roles
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          user_roles (
            id,
            role,
            created_at
          )
        `)
        .order('email');

      if (error) {
        console.error('Error fetching users with roles:', error);
        toast.error(`Erreur lors du chargement des utilisateurs: ${error.message}`);
        throw error;
      }

      // Map users to include role info
      return ((data || []) as unknown as UserWithRoleJoin[]).map(user => {
        const roleRecord = user.user_roles?.[0];
        
        return {
          id: roleRecord?.id || user.id,
          user_id: user.id,
          email: user.email || 'Email inconnu',
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          role: roleRecord?.role || 'viewer',
          created_at: roleRecord?.created_at || new Date().toISOString()
        };
      }) as UserWithRole[];
    },
    // Only run query when auth is ready AND user is authenticated
    enabled: authReady && !!userId,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
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
