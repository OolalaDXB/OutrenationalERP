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

      // Try to get auth user emails using the RPC function (admin only)
      let authUsersMap = new Map<string, { email: string; created_at: string }>();
      try {
        const { data: authUsers, error: authError } = await supabase
          .rpc('get_auth_users_for_admin');
        
        if (!authError && authUsers) {
          authUsersMap = new Map(authUsers.map((u: { id: string; email: string; created_at: string }) => [
            u.id, 
            { email: u.email, created_at: u.created_at }
          ]));
        }
      } catch (e) {
        // If RPC fails (non-admin), we'll use the users table fallback
        console.log('Could not fetch auth users (expected for non-admin)');
      }

      // Map roles to include user info
      const usersMap = new Map(users?.map(u => [u.auth_user_id, {
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name
      }]) || []);
      
      return (roles || []).map(role => {
        const userInfo = usersMap.get(role.user_id);
        const authUserInfo = authUsersMap.get(role.user_id);
        
        // Prioritize: users table email > auth users email > 'Email inconnu'
        const email = userInfo?.email || authUserInfo?.email || 'Email inconnu';
        
        return {
          id: role.id,
          user_id: role.user_id,
          email,
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
