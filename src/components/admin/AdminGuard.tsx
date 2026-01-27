import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSillonAdmin } from '@/hooks/useSillonAdmin';

interface AdminGuardProps {
  children: React.ReactNode;
  /** Require specific permission (optional) */
  requiredPermission?: string;
}

export function AdminGuard({ children, requiredPermission }: AdminGuardProps) {
  const navigate = useNavigate();
  const { isLoading, isAdmin, can } = useSillonAdmin();

  useEffect(() => {
    if (!isLoading) {
      if (!isAdmin) {
        navigate('/', { replace: true });
      } else if (requiredPermission && !can(requiredPermission as any)) {
        // Has admin access but not this specific permission
        navigate('/admin', { replace: true });
      }
    }
  }, [isAdmin, isLoading, navigate, requiredPermission, can]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  if (requiredPermission && !can(requiredPermission as any)) {
    return null;
  }

  return <>{children}</>;
}
