import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTenantContext } from '@/contexts/TenantContext';
import { Loader2 } from 'lucide-react';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Dashboard", subtitle: "Vue d'ensemble" },
  "/orders": { title: "Commandes", subtitle: "Gestion des commandes" },
  "/products": { title: "Produits", subtitle: "Catalogue produits" },
  "/suppliers": { title: "Fournisseurs", subtitle: "Gestion fournisseurs" },
  "/labels": { title: "Labels", subtitle: "Catalogue labels" },
  "/artists": { title: "Artistes", subtitle: "Catalogue artistes" },
  "/inventory": { title: "Inventaire", subtitle: "État des stocks" },
  "/movements": { title: "Mouvements", subtitle: "Historique stock" },
  "/reorder": { title: "Réapprovisionnement", subtitle: "Suggestions réappro" },
  "/purchase-orders": { title: "Achats fournisseurs", subtitle: "Commandes d'achat" },
  "/purchase-orders/new": { title: "Nouvelle commande", subtitle: "Créer une commande fournisseur" },
  "/customers": { title: "Clients", subtitle: "Base clients" },
  "/invoices": { title: "Factures", subtitle: "Facturation" },
  "/finances": { title: "Finances", subtitle: "Tableau de bord financier" },
  "/finances/journal": { title: "Journal des paiements", subtitle: "Historique des transactions" },
  "/finances/impayes": { title: "Factures impayées", subtitle: "Retards de paiement" },
  "/analytics": { title: "Analytics", subtitle: "Statistiques" },
  "/supplier-sales": { title: "Ventes par fournisseur", subtitle: "Rapports" },
  "/admin/roles": { title: "Gestion des rôles", subtitle: "Administration" },
  "/admin/settings": { title: "Paramètres", subtitle: "Configuration" },
};

interface TenantBackofficeLayoutProps {
  children: ReactNode;
}

export function TenantBackofficeLayout({ children }: TenantBackofficeLayoutProps) {
  const { user, loading } = useAuth();
  const tenant = useTenantContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract path relative to tenant base
  const tenantBase = `/t/${tenant.slug}`;
  const relativePath = location.pathname.replace(tenantBase, '') || '/';

  const handleNavigate = (path: string) => {
    // Navigate within tenant scope
    navigate(`${tenantBase}${path}`);
  };

  // Redirect to login page when user signs out
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    // Return loading while redirect happens
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get page info - handle dynamic routes
  let pageInfo = pageTitles[relativePath];
  if (!pageInfo && relativePath.startsWith('/purchase-orders/')) {
    pageInfo = { title: "Commande fournisseur", subtitle: "Détail de la commande" };
  }
  if (!pageInfo) {
    pageInfo = { title: "Dashboard" };
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPath={relativePath} onNavigate={handleNavigate} />
      <PageLayout title={pageInfo.title} subtitle={pageInfo.subtitle} onNavigate={handleNavigate}>
        {children}
      </PageLayout>
    </div>
  );
}
