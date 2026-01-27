import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useSillonAdmin } from '@/hooks/useSillonAdmin';
import { supabase } from '@/integrations/supabase/client';

interface AdminGuardProps {
  children: React.ReactNode;
  /** Require specific permission (optional) */
  requiredPermission?: string;
}

export function AdminGuard({ children, requiredPermission }: AdminGuardProps) {
  const navigate = useNavigate();
  const { isLoading, isAdmin, can } = useSillonAdmin();

  useEffect(() => {
    const run = async () => {
      if (isLoading) return;

      // If there's no session, always go to login.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }

      if (!isAdmin) {
        navigate('/login', { replace: true });
        return;
      }

      if (requiredPermission && !can(requiredPermission as any)) {
        navigate('/admin', { replace: true });
      }
    };

    run();
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
