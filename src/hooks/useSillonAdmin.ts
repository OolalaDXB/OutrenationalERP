import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type SillonAdminRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

interface SillonAdminData {
  id: string;
  email: string;
  role: SillonAdminRole;
  display_name: string | null;
  is_active: boolean;
  user_id: string | null;
  last_login_at: string | null;
  created_at: string;
}

type Permission = 
  | 'canViewTenants'
  | 'canEditTenant'
  | 'canSuspendTenant'
  | 'canViewUsers'
  | 'canResetPassword'
  | 'canResendEmail'
  | 'canDeleteUser'
  | 'canChangeUserRole'
  | 'canViewPlans'
  | 'canEditPlans'
  | 'canEditAddons'
  | 'canAssignPlan'
  | 'canAddOverride'
  | 'canViewAnalytics'
  | 'canViewAuditLogs'
  | 'canManageSillonAdmins'
  | 'canImpersonate';

// Permission matrix by role
const PERMISSIONS: Record<SillonAdminRole, Permission[]> = {
  super_admin: [
    'canViewTenants', 'canEditTenant', 'canSuspendTenant',
    'canViewUsers', 'canResetPassword', 'canResendEmail', 'canDeleteUser', 'canChangeUserRole',
    'canViewPlans', 'canEditPlans', 'canEditAddons', 'canAssignPlan', 'canAddOverride',
    'canViewAnalytics', 'canViewAuditLogs',
    'canManageSillonAdmins', 'canImpersonate',
  ],
  admin: [
    'canViewTenants', 'canEditTenant', 'canSuspendTenant',
    'canViewUsers', 'canResetPassword', 'canResendEmail', 'canChangeUserRole',
    'canViewPlans', 'canAssignPlan',
    'canViewAnalytics', 'canViewAuditLogs',
  ],
  staff: [
    'canViewTenants',
    'canViewUsers', 'canResetPassword', 'canResendEmail',
    'canViewPlans',
    'canViewAuditLogs',
  ],
  viewer: [
    'canViewTenants',
    'canViewUsers',
    'canViewPlans',
  ],
};

export function useSillonAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<SillonAdminData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch admin data when user changes
  useEffect(() => {
    async function fetchAdminData() {
      if (!user?.email) {
        setAdminData(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sillon_admins')
          .select('*')
          .eq('email', user.email.toLowerCase())
          .eq('is_active', true)
          .maybeSingle();

        if (error) {
          console.error('Error fetching admin data:', error);
          setAdminData(null);
        } else {
          setAdminData(data as SillonAdminData | null);
        }
      } catch (err) {
        console.error('Error in fetchAdminData:', err);
        setAdminData(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAdminData();
  }, [user?.email]);

  const role = adminData?.role ?? null;
  const isAdmin = !!adminData && adminData.is_active;
  const isSuperAdmin = role === 'super_admin';

  // Check if user has a specific permission
  const can = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!role) return false;
      return PERMISSIONS[role]?.includes(permission) ?? false;
    };
  }, [role]);

  // Get all permissions for current role
  const permissions = useMemo(() => {
    if (!role) return [];
    return PERMISSIONS[role] ?? [];
  }, [role]);

  return {
    user,
    adminData,
    isLoading,
    isAdmin,
    isSuperAdmin,
    role,
    can,
    permissions,
  };
}
