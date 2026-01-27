import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TenantContextType, TenantSettings } from '@/contexts/TenantContext';

interface UserTenant {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  role: string;
}

export function useTenant(slug: string | undefined) {
  return useQuery<TenantContextType | null>({
    queryKey: ['tenant', slug],
    queryFn: async () => {
      if (!slug) return null;

      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // SECURITY: Only fetch tenants the user has access to (prevents enumeration)
      const { data: userTenants, error: tenantsError } = await supabase
        .rpc('get_user_tenants') as { data: UserTenant[] | null; error: any };

      if (tenantsError) {
        console.error('Failed to fetch user tenants:', tenantsError);
        throw new Error('Failed to fetch tenants');
      }

      // Find the requested tenant in the user's authorized list
      const authorizedTenant = userTenants?.find(t => t.tenant_slug === slug);
      
      if (!authorizedTenant) {
        throw new Error('ACCESS_DENIED');
      }

      // Now fetch full tenant details (we know user has access)
      const { data: tenant, error: detailError } = await supabase
        .from('tenants')
        .select('id, name, slug, settings, status')
        .eq('id', authorizedTenant.tenant_id)
        .single();

      if (detailError || !tenant) {
        console.error('Failed to fetch tenant details:', detailError);
        throw new Error('Tenant not found');
      }

      // Parse settings safely
      const settings: TenantSettings = typeof tenant.settings === 'object' 
        ? (tenant.settings as TenantSettings) 
        : {};

      return {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        settings,
        status: tenant.status,
      };
    },
    enabled: !!slug,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUserTenants() {
  return useQuery<UserTenant[]>({
    queryKey: ['user-tenants'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        return [];
      }

      const { data, error } = await supabase.rpc('get_user_tenants') as { 
        data: UserTenant[] | null; 
        error: any;
      };

      if (error) {
        console.error('Failed to fetch user tenants:', error);
        return [];
      }

      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}
