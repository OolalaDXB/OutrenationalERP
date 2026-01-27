import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SillonAdminRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

interface SillonAdmin {
  id: string;
  user_id: string;
  email: string;
  role: SillonAdminRole;
  display_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface SillonAdminPermissions {
  canViewTenants: boolean;
  canViewUsers: boolean;
  canViewAnalytics: boolean;
  canViewAuditLogs: boolean;
  canViewPlans: boolean;
  canCreateTenant: boolean;
  canEditTenant: boolean;
  canSuspendTenant: boolean;
  canDeleteTenant: boolean;
  canAssignPlan: boolean;
  canResetPassword: boolean;
  canResendEmail: boolean;
  canDeleteUser: boolean;
  canChangeUserRole: boolean;
  canAddOverride: boolean;
  canRemoveOverride: boolean;
  canEditPlans: boolean;
  canEditAddons: boolean;
  canImpersonate: boolean;
  canManageSillonAdmins: boolean;
  canExportData: boolean;
}

const ROLE_PERMISSIONS: Record<SillonAdminRole, SillonAdminPermissions> = {
  super_admin: {
    canViewTenants: true, canViewUsers: true, canViewAnalytics: true, canViewAuditLogs: true, canViewPlans: true,
    canCreateTenant: true, canEditTenant: true, canSuspendTenant: true, canDeleteTenant: true, canAssignPlan: true,
    canResetPassword: true, canResendEmail: true, canDeleteUser: true, canChangeUserRole: true,
    canAddOverride: true, canRemoveOverride: true, canEditPlans: true, canEditAddons: true,
    canImpersonate: true, canManageSillonAdmins: true, canExportData: true,
  },
  admin: {
    canViewTenants: true, canViewUsers: true, canViewAnalytics: true, canViewAuditLogs: true, canViewPlans: true,
    canCreateTenant: true, canEditTenant: true, canSuspendTenant: true, canDeleteTenant: false, canAssignPlan: true,
    canResetPassword: true, canResendEmail: true, canDeleteUser: true, canChangeUserRole: true,
    canAddOverride: true, canRemoveOverride: true, canEditPlans: true, canEditAddons: true,
    canImpersonate: false, canManageSillonAdmins: false, canExportData: true,
  },
  staff: {
    canViewTenants: true, canViewUsers: true, canViewAnalytics: true, canViewAuditLogs: true, canViewPlans: true,
    canCreateTenant: false, canEditTenant: false, canSuspendTenant: false, canDeleteTenant: false, canAssignPlan: false,
    canResetPassword: true, canResendEmail: true, canDeleteUser: false, canChangeUserRole: false,
    canAddOverride: false, canRemoveOverride: false, canEditPlans: false, canEditAddons: false,
    canImpersonate: false, canManageSillonAdmins: false, canExportData: false,
  },
  viewer: {
    canViewTenants: true, canViewUsers: true, canViewAnalytics: true, canViewAuditLogs: false, canViewPlans: true,
    canCreateTenant: false, canEditTenant: false, canSuspendTenant: false, canDeleteTenant: false, canAssignPlan: false,
    canResetPassword: false, canResendEmail: false, canDeleteUser: false, canChangeUserRole: false,
    canAddOverride: false, canRemoveOverride: false, canEditPlans: false, canEditAddons: false,
    canImpersonate: false, canManageSillonAdmins: false, canExportData: false,
  },
};

const HARDCODED_ADMINS = ['mickael.thomas@pm.me'];

export function useSillonAdmin() {
  const { data: session } = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  const user = session?.user;

  const { data: adminData, isLoading, error } = useQuery({
    queryKey: ['sillon-admin', user?.id],
    queryFn: async (): Promise<SillonAdmin | null> => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('sillon_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error || !data) {
        // Fallback to hardcoded
        if (user.email && HARDCODED_ADMINS.includes(user.email.toLowerCase())) {
          return {
            id: 'hardcoded', user_id: user.id, email: user.email,
            role: 'super_admin', display_name: null,
            is_active: true, last_login_at: null, created_at: new Date().toISOString(),
          };
        }
        return null;
      }
      
      return data as SillonAdmin;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  
  const isAdmin = !!adminData;
  const role = adminData?.role ?? null;
  const permissions = role ? ROLE_PERMISSIONS[role] : null;
  
  return {
    isLoading, error, isAdmin, adminData, role, permissions,
    isSuperAdmin: role === 'super_admin',
    isAdminOrHigher: role === 'super_admin' || role === 'admin',
    isStaffOrHigher: role === 'super_admin' || role === 'admin' || role === 'staff',
    can: (permission: keyof SillonAdminPermissions): boolean => permissions?.[permission] ?? false,
  };
}
