import { Link, useLocation, Outlet, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ShoppingCart, Package, FileText, User, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProAuth } from "@/hooks/useProAuth";
import { useCart } from "@/hooks/useCart";
import { cn } from "@/lib/utils";
import outreNationalLogo from "@/assets/outre-national-logo.png";

const NAV_ITEMS = [
  { to: "/pro/catalog", label: "Catalogue", icon: Package },
  { to: "/pro/orders", label: "Mes commandes", icon: FileText },
  { to: "/pro/account", label: "Mon compte", icon: User },
];

export function ProLayout() {
  const location = useLocation();
  const { user, customer, isLoading, isApproved, isProfessional, needsProfile, signOut } = useProAuth();
  const { itemCount } = useCart();
  
  // Track whether we've completed customer resolution for this session
  const [customerResolved, setCustomerResolved] = useState(false);

  // Mark customer as resolved once we have definitive data
  useEffect(() => {
    // Skip if auth still loading
    if (isLoading) {
      setCustomerResolved(false);
      return;
    }
    
    // If user is not logged in, resolution is complete
    if (!user) {
      setCustomerResolved(true);
      return;
    }
    
    // If we have customer data OR needsProfile flag, resolution is complete
    if (customer || needsProfile) {
      setCustomerResolved(true);
      return;
    }
    
    // User exists but no customer yet - give a short grace period
    const timer = setTimeout(() => {
      setCustomerResolved(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [isLoading, user, customer, needsProfile]);

  // Show loader while auth is loading OR while customer data is being fetched
  if (isLoading || !customerResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/pro/login" replace />;
  }

  // Logged in but customer profile not resolved yet (or needs completion)
  if (!customer) {
    if (needsProfile) {
      return <Navigate to="/pro/complete-profile" replace />;
    }

    // Still no customer after resolution - show restricted access
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning/20 flex items-center justify-center">
            <User className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold">Accès restreint</h1>
          <p className="text-muted-foreground">
            Ce portail est réservé aux clients professionnels. 
            Veuillez contacter notre équipe commerciale pour créer un compte professionnel.
          </p>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>
    );
  }

  // Not a professional customer or not approved
  if (!isProfessional || !isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning/20 flex items-center justify-center">
            <User className="w-8 h-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold">Accès restreint</h1>
          {!isProfessional ? (
            <p className="text-muted-foreground">
              Ce portail est réservé aux clients professionnels. 
              Veuillez contacter notre équipe commerciale pour créer un compte professionnel.
            </p>
          ) : (
            <p className="text-muted-foreground">
              Votre compte professionnel est en attente de validation. 
              Nous vous contacterons dès que votre compte sera activé.
            </p>
          )}
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/pro" className="flex items-center gap-2">
              <img src={outreNationalLogo} alt="Outre-National" className="w-8 h-8 rounded" />
              <span className="font-semibold text-lg hidden sm:block">Outre-National</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === item.to
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Link to="/pro/cart" className="relative">
                <Button variant="ghost" size="icon">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Button>
              </Link>
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium">{customer?.company_name || customer?.email}</div>
                <div className="text-xs text-muted-foreground">
                  Remise: {customer?.discount_rate || 0}%
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} title="Déconnexion">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-border">
          <div className="flex justify-around py-2">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 text-xs",
                  location.pathname === item.to
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2025 Outre-National. Portail professionnel.</p>
            <div className="flex items-center gap-4">
              <span>Contact: pro@outre-national.com</span>
              <span>Tél: +33 1 23 45 67 89</span>
            </div>
          </div>
          <div className="text-center mt-4">
            <span className="text-xs text-muted-foreground">Powered by Sillon</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
