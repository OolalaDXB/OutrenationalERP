import { Search, Disc3 } from "lucide-react";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useTenantContextOptional } from "@/contexts/TenantContext";

interface HeaderProps {
  title: string;
  subtitle?: string;
  onNavigate?: (path: string) => void;
}

export function Header({ title, subtitle, onNavigate }: HeaderProps) {
  const tenant = useTenantContextOptional();
  
  // Tenant branding with fallback
  const logoUrl = tenant?.settings?.logo_url || null;
  const companyName = tenant?.settings?.company_name || tenant?.name || 'Sillon';

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {/* Logo - fallback to Sillon disc icon */}
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={companyName} 
            className="w-8 h-8 rounded object-contain dark:invert"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Disc3 className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <span className="text-sm text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg w-[280px]">
          <Search className="w-[18px] h-[18px] text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <NotificationCenter onNavigate={onNavigate} />
      </div>
    </header>
  );
}
