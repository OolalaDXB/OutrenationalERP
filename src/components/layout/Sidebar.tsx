import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "@/hooks/use-toast";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Palette,
  Tag,
  Warehouse,
  ArrowUpDown,
  RefreshCw as RefreshCwIcon,
  RotateCw,
  UserCircle,
  FileText,
  BarChart3,
  PieChart,
  LogOut,
  UserCog,
  Shield,
  ShieldCheck,
  Eye,
  Database,
  Settings
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import outreNationalLogo from "@/assets/outre-national-logo.png";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
  adminOnly?: boolean;
  featureFlag?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/" },
      { icon: ShoppingCart, label: "Commandes", href: "/orders", badge: 3 },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { icon: Package, label: "Catalogue", href: "/products" },
      { icon: Users, label: "Fournisseurs", href: "/suppliers" },
      { icon: Tag, label: "Labels", href: "/labels" },
      { icon: Palette, label: "Artistes", href: "/artists", featureFlag: "show_artists_section" },
    ],
  },
  {
    title: "Stock",
    items: [
      { icon: Warehouse, label: "Inventaire", href: "/inventory" },
      { icon: ArrowUpDown, label: "Mouvements", href: "/movements" },
      { icon: RefreshCwIcon, label: "Réapprovisionnement", href: "/reorder" },
    ],
  },
  {
    title: "Ventes",
    items: [
      { icon: UserCircle, label: "Clients", href: "/customers" },
      { icon: FileText, label: "Factures", href: "/invoices" },
    ],
  },
  {
    title: "Rapports",
    items: [
      { icon: BarChart3, label: "Analytics", href: "/analytics" },
      { icon: PieChart, label: "Ventes par fournisseur", href: "/supplier-sales" },
    ],
  },
  {
    title: "Administration",
    items: [
      { icon: UserCog, label: "Gestion des rôles", href: "/admin/roles", adminOnly: true },
      { icon: Settings, label: "Paramètres", href: "/admin/settings", adminOnly: true },
    ],
  },
];

const roleIcons = {
  admin: ShieldCheck,
  staff: Shield,
  viewer: Eye,
};

const roleColors = {
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
  staff: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  viewer: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const roleLabels = {
  admin: "Admin",
  staff: "Staff",
  viewer: "Viewer",
};

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Sidebar({ currentPath, onNavigate }: SidebarProps) {
  const { user, signOut, hasRole, refreshRole } = useAuth();
  const { data: settings } = useSettings();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  const handleRefreshRole = async () => {
    setIsRefreshing(true);
    await refreshRole();
    setIsRefreshing(false);
    const newRole = user?.role || 'viewer';
    toast({
      title: "Rôle mis à jour",
      description: `Votre rôle actuel : ${newRole}`,
      variant: newRole as "admin" | "staff" | "viewer",
    });
  };

  // Get user initials and display name
  const userEmail = user?.email || '';
  const userInitials = userEmail ? userEmail.substring(0, 2).toUpperCase() : 'U';
  const userRole = user?.role || 'viewer';
  const RoleIcon = roleIcons[userRole] || Eye;

  // Filter navigation based on role and feature flags
  const filteredNavigation = navigation.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Check admin only
      if (item.adminOnly && !hasRole('admin')) return false;
      // Check feature flags
      if (item.featureFlag) {
        const flagValue = settings?.[item.featureFlag as keyof typeof settings];
        if (!flagValue) return false;
      }
      return true;
    })
  })).filter(section => section.items.length > 0);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-sidebar flex flex-col z-50">
      {/* Header */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={outreNationalLogo} alt="Outre-National" className="w-10 h-10 rounded invert" />
          <span className="text-lg font-bold text-white">Outre-National</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className={cn("text-[0.6rem] font-semibold uppercase", roleColors[userRole])}>
            <RoleIcon className="w-3 h-3 mr-1" />
            {roleLabels[userRole]}
          </Badge>
          <button
            onClick={handleRefreshRole}
            disabled={isRefreshing}
            className="p-1 rounded hover:bg-sidebar-hover text-sidebar-foreground/50 hover:text-white transition-colors disabled:opacity-50"
            title="Rafraîchir le rôle"
          >
            <RotateCw className={cn("w-3 h-3", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {filteredNavigation.map((section) => (
          <div key={section.title} className="mb-6">
            <div className="px-3 mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.href;
              
              return (
                <button
                  key={item.href}
                  onClick={() => onNavigate(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground transition-all duration-200 mb-0.5",
                    "hover:bg-sidebar-hover hover:text-white",
                    isActive && "bg-primary text-white"
                  )}
                >
                  <Icon className={cn("w-5 h-5 opacity-70", isActive && "opacity-100")} />
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full bg-danger text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{userEmail}</div>
            <div className="text-xs text-sidebar-foreground capitalize">{userRole}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-sidebar-hover text-sidebar-foreground hover:text-white transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="px-3 py-2 text-center">
          <span className="text-xs text-sidebar-foreground/50">Powered by Sillon</span>
        </div>
      </div>
    </aside>
  );
}
