import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserTenants } from '@/hooks/useTenant';
import { Loader2 } from 'lucide-react';

/**
 * Handles backward compatibility redirects from old /pro/* URLs
 * to new tenant-scoped /t/{slug}/pro/* URLs.
 * 
 * Logs deprecated URL usage for monitoring.
 */
export function RedirectToTenantPro() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: tenants, isLoading } = useUserTenants();

  useEffect(() => {
    // Log deprecated URL usage
    console.warn(`[DEPRECATED URL] ${location.pathname} - migrate to /t/{slug}/pro/*`);
  }, [location.pathname]);

  useEffect(() => {
    if (isLoading) return;

    if (!tenants || tenants.length === 0) {
      // No tenant access - redirect to Sillon login
      navigate('/login', { replace: true });
      return;
    }

    // Use the first tenant (or the only one)
    const tenantSlug = tenants[0].tenant_slug;
    const subPath = location.pathname.replace('/pro', '');
    
    navigate(`/t/${tenantSlug}/pro${subPath}`, { replace: true });
  }, [tenants, isLoading, location.pathname, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Handles backward compatibility redirects from old backoffice URLs
 * to new tenant-scoped URLs.
 */
export function RedirectToTenantBackoffice() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: tenants, isLoading } = useUserTenants();

  useEffect(() => {
    // Log deprecated URL usage
    console.warn(`[DEPRECATED URL] ${location.pathname} - migrate to /t/{slug}${location.pathname}`);
  }, [location.pathname]);

  useEffect(() => {
    if (isLoading) return;

    if (!tenants || tenants.length === 0) {
      // No tenant access - redirect to Sillon login
      navigate('/login', { replace: true });
      return;
    }

    // Use the first tenant (or the only one)
    const tenantSlug = tenants[0].tenant_slug;
    
    navigate(`/t/${tenantSlug}${location.pathname}`, { replace: true });
  }, [tenants, isLoading, location.pathname, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
