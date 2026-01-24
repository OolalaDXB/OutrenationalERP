import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageLayout } from "@/components/layout/PageLayout";
import { NotificationProvider } from "@/hooks/use-notifications";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProAuthProvider } from "@/hooks/useProAuth";
import { CartProvider } from "@/hooks/useCart";
import { Dashboard } from "@/pages/Dashboard";
import { OrdersPage } from "@/pages/Orders";
import { SuppliersPage } from "@/pages/Suppliers";
import { ProductsPage } from "@/pages/Products";
import { InventoryPage } from "@/pages/Inventory";
import { CustomersPage } from "@/pages/Customers";
import { ArtistsPage } from "@/pages/Artists";
import { LabelsPage } from "@/pages/Labels";
import { SupplierSalesPage } from "@/pages/SupplierSales";
import { ReorderPage } from "@/pages/Reorder";
import { InvoicesPage } from "@/pages/Invoices";
import { AnalyticsPage } from "@/pages/Analytics";
import { StockMovementsPage } from "@/pages/StockMovements";
import { UserRolesPage } from "@/pages/UserRoles";
import FinancesPage from "@/pages/Finances";
import PaymentJournalPage from "@/pages/finances/PaymentJournal";
import OverdueInvoicesPage from "@/pages/finances/OverdueInvoices";
import { PurchaseOrdersPage } from "@/pages/PurchaseOrders";
import { PurchaseOrderCreatePage } from "@/pages/PurchaseOrderCreate";
import { PurchaseOrderDetailPage } from "@/pages/PurchaseOrderDetail";

import { SettingsPage } from "@/pages/Settings";
import { LoginPage } from "@/pages/Login";
import { ResetPasswordPage } from "@/pages/ResetPassword";
import { ProLayout } from "@/components/pro/ProLayout";
import { ProLogin } from "@/pages/pro/ProLogin";
import { ProRegister } from "@/pages/pro/ProRegister";
import { ProPendingApproval } from "@/pages/pro/ProPendingApproval";
import { ProCompleteProfile } from "@/pages/pro/ProCompleteProfile";
import { ProDashboard } from "@/pages/pro/ProDashboard";
import { ProCatalog } from "@/pages/pro/ProCatalog";
import { ProCart } from "@/pages/pro/ProCart";
import { ProCheckout } from "@/pages/pro/ProCheckout";
import { ProOrderSuccess } from "@/pages/pro/ProOrderSuccess";
import { ProOrders } from "@/pages/pro/ProOrders";
import { ProInvoices } from "@/pages/pro/ProInvoices";
import { ProAccount } from "@/pages/pro/ProAccount";
import { Loader2 } from "lucide-react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

// Configure QueryClient with proper defaults to avoid cache/retry issues
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes before considering it stale
      staleTime: 1000 * 60 * 5,
      // Keep unused data in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Custom retry logic
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (
          errorMessage.includes('JWT') ||
          errorMessage.includes('401') ||
          errorMessage.includes('403') ||
          errorMessage.includes('not authenticated') ||
          errorMessage.includes('Invalid token')
        ) {
          return false;
        }
        // Retry other errors up to 2 times
        return failureCount < 2;
      },
      // Don't refetch on window focus to avoid unnecessary requests
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect automatically
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Don't retry mutations by default
      retry: false,
    },
  },
});

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

function BackofficeContentInner({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState("/");

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    onNavigate(path);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    // Handle dynamic routes
    if (currentPath.startsWith('/purchase-orders/') && currentPath !== '/purchase-orders/new') {
      const poId = currentPath.split('/')[2];
      return <PurchaseOrderDetailPage poId={poId} onNavigate={handleNavigate} />;
    }

    switch (currentPath) {
      case "/": return <Dashboard />;
      case "/orders": return <OrdersPage />;
      case "/products": return <ProductsPage />;
      case "/suppliers": return <SuppliersPage />;
      case "/labels": return <LabelsPage />;
      case "/inventory": return <InventoryPage />;
      case "/customers": return <CustomersPage />;
      case "/artists": return <ArtistsPage />;
      case "/movements": return <StockMovementsPage />;
      case "/reorder": return <ReorderPage />;
      case "/purchase-orders": return <PurchaseOrdersPage onNavigate={handleNavigate} />;
      case "/purchase-orders/new": return <PurchaseOrderCreatePage onNavigate={handleNavigate} />;
      case "/invoices": return <InvoicesPage />;
      case "/finances": return <FinancesPage onNavigate={handleNavigate} />;
      case "/finances/journal": return <PaymentJournalPage onNavigate={handleNavigate} />;
      case "/finances/impayes": return <OverdueInvoicesPage onNavigate={handleNavigate} />;
      case "/analytics": return <AnalyticsPage />;
      case "/supplier-sales": return <SupplierSalesPage />;
      case "/admin/roles": return <UserRolesPage />;
      case "/admin/settings": return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  const pageInfo = pageTitles[currentPath] || { title: "Dashboard" };

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background">
        <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
        <PageLayout title={pageInfo.title} subtitle={pageInfo.subtitle} onNavigate={handleNavigate}>
          {renderPage()}
        </PageLayout>
      </div>
    </NotificationProvider>
  );
}

function BackofficeContent() {
  return (
    <AuthProvider>
      <BackofficeContentInner onNavigate={() => {}} />
    </AuthProvider>
  );
}

function AppRouter() {
  const location = useLocation();
  const isProRoute = location.pathname.startsWith('/pro');
  const isResetPasswordRoute = location.pathname === '/reset-password';

  // Handle reset password route separately (no auth required)
  if (isResetPasswordRoute) {
    return <ResetPasswordPage />;
  }

  if (isProRoute) {
    return (
      <ProAuthProvider>
        <CartProvider>
          <Routes>
            <Route path="/pro/login" element={<ProLogin />} />
            <Route path="/pro/register" element={<ProRegister />} />
            <Route path="/pro/pending" element={<ProPendingApproval />} />
            <Route path="/pro/complete-profile" element={<ProCompleteProfile />} />
            <Route path="/pro" element={<ProLayout />}>
              <Route index element={<ProDashboard />} />
              <Route path="catalog" element={<ProCatalog />} />
              <Route path="cart" element={<ProCart />} />
              <Route path="checkout" element={<ProCheckout />} />
              <Route path="order-success" element={<ProOrderSuccess />} />
              <Route path="orders" element={<ProOrders />} />
              <Route path="invoices" element={<ProInvoices />} />
              <Route path="account" element={<ProAccount />} />
            </Route>
          </Routes>
        </CartProvider>
      </ProAuthProvider>
    );
  }

  return <BackofficeContent />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
