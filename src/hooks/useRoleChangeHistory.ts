import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from './useAuth';

export interface RoleChangeRecord {
  id: string;
  user_id: string;
  user_email?: string;
  changed_by: string;
  changed_by_email?: string;
  old_role: AppRole | null;
  new_role: AppRole;
  changed_at: string;
  reason: string | null;
}

export function useRoleChangeHistory(limit = 20) {
  const { user, loading } = useAuth();
  const authReady = !loading;
  const userId = user?.id;

  return useQuery({
    queryKey: ['role-change-history', userId, limit],
    queryFn: async () => {
      // Fetch role change history
      const { data: history, error } = await supabase
        .from('role_change_history')
        .select('*')
        .order('changed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching role change history:', error);
        throw error;
      }

      // Fetch user emails for the user_ids and changed_by ids
      const userIds = new Set<string>();
      (history || []).forEach(h => {
        userIds.add(h.user_id);
        if (h.changed_by) userIds.add(h.changed_by);
      });

      const { data: users } = await supabase
        .from('users')
        .select('id, email')
        .in('id', Array.from(userIds));

      const emailMap = new Map<string, string>();
      (users || []).forEach(u => emailMap.set(u.id, u.email));

      // Map with emails
      return (history || []).map(h => ({
        id: h.id,
        user_id: h.user_id,
        user_email: emailMap.get(h.user_id) || 'Utilisateur inconnu',
        changed_by: h.changed_by,
        changed_by_email: emailMap.get(h.changed_by) || 'Utilisateur inconnu',
        old_role: h.old_role as AppRole | null,
        new_role: h.new_role as AppRole,
        changed_at: h.changed_at,
        reason: h.reason,
      })) as RoleChangeRecord[];
    },
    enabled: authReady && !!userId,
  });
}

export async function logRoleChange(
  userId: string,
  changedBy: string,
  oldRole: AppRole | null,
  newRole: AppRole,
  reason?: string
) {
  const { error } = await supabase
    .from('role_change_history')
    .insert({
      user_id: userId,
      changed_by: changedBy,
      old_role: oldRole,
      new_role: newRole,
      reason: reason || null,
    } as any);

  if (error) {
    console.error('Error logging role change:', error);
    throw error;
  }
}
