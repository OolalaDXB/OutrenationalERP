import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from './useAuth';

export interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: AppRole;
  created_at: string;
}

export function useUsersWithRoles() {
  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      // First get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;

      // Get user info from the users table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('auth_user_id, email, first_name, last_name');

      if (usersError) throw usersError;

      // Map roles to include user info
      const usersMap = new Map(users?.map(u => [u.auth_user_id, {
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name
      }]) || []);
      
      return (roles || []).map(role => {
        const userInfo = usersMap.get(role.user_id);
        return {
          id: role.id,
          user_id: role.user_id,
          email: userInfo?.email || 'Email inconnu',
          first_name: userInfo?.first_name || null,
          last_name: userInfo?.last_name || null,
          role: role.role as AppRole,
          created_at: role.created_at
        };
      }) as UserWithRole[];
    }
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
