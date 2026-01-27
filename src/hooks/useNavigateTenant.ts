import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';

/**
 * Hook for navigating within a tenant's scope.
 * Automatically prefixes paths with /t/{tenantSlug}
 */
export function useNavigateTenant() {
  const navigate = useNavigate();
  const tenant = useTenantContext();

  return useCallback((path: string, options?: { replace?: boolean }) => {
    const fullPath = path.startsWith('/') 
      ? `/t/${tenant.slug}${path}` 
      : `/t/${tenant.slug}/${path}`;
    navigate(fullPath, options);
  }, [navigate, tenant.slug]);
}

/**
 * Build a tenant-scoped URL path
 */
export function useTenantPath() {
  const tenant = useTenantContext();

  return useCallback((path: string) => {
    return path.startsWith('/') 
      ? `/t/${tenant.slug}${path}` 
      : `/t/${tenant.slug}/${path}`;
  }, [tenant.slug]);
}
