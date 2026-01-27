import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  Disc3, 
  LayoutDashboard, 
  Building2, 
  FileText, 
  LogOut, 
  ChevronLeft,
  Users,
  BarChart3,
  ScrollText,
  CreditCard,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSillonAdmin } from '@/hooks/useSillonAdmin';

const mainNavItems = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users, permission: 'canViewUsers' },
  { to: '/admin/requests', label: 'Demandes', icon: FileText },
];

const configNavItems = [
  { to: '/admin/plans', label: 'Plans & Tarifs', icon: CreditCard, permission: 'canViewPlans' },
];

const insightNavItems = [
  { to: '/admin/analytics', label: 'Analytique', icon: BarChart3, permission: 'canViewAnalytics' },
  { to: '/admin/audit', label: 'Journaux d\'audit', icon: ScrollText, permission: 'canViewAuditLogs' },
];

const adminNavItems = [
  { to: '/admin/team', label: 'Équipe Sillon', icon: Shield, permission: 'canManageSillonAdmins' },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const { adminData, role, can, isSuperAdmin } = useSillonAdmin();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success('Déconnexion réussie');
    navigate('/login');
  };

  const renderNavItems = (items: typeof mainNavItems) => {
    return items
      .filter(item => !item.permission || can(item.permission as any))
      .map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          <item.icon className="w-4 h-4" />
          {item.label}
        </NavLink>
      ));
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r flex flex-col">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center gap-3 border-b">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Disc3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Sillon</span>
            <span className="text-xs text-muted-foreground ml-2">Control Panel</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {/* Main */}
          <div className="space-y-1">
            {renderNavItems(mainNavItems)}
          </div>

          {/* Configuration */}
          {configNavItems.some(item => !item.permission || can(item.permission as any)) && (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Configuration
              </p>
              {renderNavItems(configNavItems)}
            </div>
          )}

          {/* Insights */}
          {insightNavItems.some(item => !item.permission || can(item.permission as any)) && (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Insights
              </p>
              {renderNavItems(insightNavItems)}
            </div>
          )}

          {/* Admin */}
          {isSuperAdmin && (
            <div className="space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administration
              </p>
              {renderNavItems(adminNavItems)}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          {/* Current admin info */}
          <div className="px-3 py-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Connecté en tant que</p>
            <p className="text-sm font-medium truncate">{adminData?.display_name || adminData?.email}</p>
            <Badge variant="outline" className="mt-1 text-xs">
              {role === 'super_admin' ? 'Super Admin' : 
               role === 'admin' ? 'Admin' : 
               role === 'staff' ? 'Staff' : 'Viewer'}
            </Badge>
          </div>
          
          <Separator />
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => navigate('/')}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Retour au site
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
