import { Link, LinkProps } from 'react-router-dom';
import { useTenantContext } from '@/contexts/TenantContext';

interface LinkTenantProps extends Omit<LinkProps, 'to'> {
  to: string;
}

/**
 * A Link component that automatically prefixes the path with the current tenant slug.
 * Use this for all internal navigation within tenant-scoped pages.
 */
export function LinkTenant({ to, children, ...props }: LinkTenantProps) {
  const tenant = useTenantContext();
  
  const fullPath = to.startsWith('/') 
    ? `/t/${tenant.slug}${to}` 
    : `/t/${tenant.slug}/${to}`;

  return (
    <Link to={fullPath} {...props}>
      {children}
    </Link>
  );
}
