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
      // Query public.users joined with user_roles
      // This avoids auth.users which is not accessible via RLS
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .order('email');

      if (usersError) throw usersError;

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Create a map of user_id -> role
      const rolesMap = new Map(
        (roles || []).map(r => [r.user_id, r])
      );

      // Map users to include role info
      // users.id is the auth user id (from the id column which references auth.users)
      return (users || []).map(user => {
        const roleRecord = rolesMap.get(user.id);
        
        return {
          id: roleRecord?.id || user.id,
          user_id: user.id,
          email: user.email || 'Email inconnu',
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          role: (roleRecord?.role as AppRole) || 'viewer',
          created_at: roleRecord?.created_at || new Date().toISOString()
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

export function useUpdateUserInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, firstName, lastName }: { userId: string; firstName: string; lastName: string }) => {
      // First check if user exists in the users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (existingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({ 
            first_name: firstName || null, 
            last_name: lastName || null 
          })
          .eq('auth_user_id', userId);

        if (error) throw error;
      } else {
        // Get email from auth users RPC
        let email = '';
        try {
          const { data: authUsers } = await supabase.rpc('get_auth_users_for_admin');
          const authUser = authUsers?.find((u: { id: string; email: string }) => u.id === userId);
          email = authUser?.email || '';
        } catch (e) {
          console.error('Could not fetch auth user email');
        }

        // Create new user entry
        const { error } = await supabase
          .from('users')
          .insert({
            auth_user_id: userId,
            email,
            first_name: firstName || null,
            last_name: lastName || null
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    }
  });
}
