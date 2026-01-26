import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
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

// Configure QueryClient with proper defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error) => {
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
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
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

function BackofficeContentInner() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const handleNavigate = (path: string) => {
    navigate(path);
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

  // Get page info - handle dynamic routes
  let pageInfo = pageTitles[currentPath];
  if (!pageInfo && currentPath.startsWith('/purchase-orders/')) {
    pageInfo = { title: "Commande fournisseur", subtitle: "Détail de la commande" };
  }
  if (!pageInfo) {
    pageInfo = { title: "Dashboard" };
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background">
        <Sidebar currentPath={currentPath} onNavigate={handleNavigate} />
        <PageLayout title={pageInfo.title} subtitle={pageInfo.subtitle} onNavigate={handleNavigate}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="labels" element={<LabelsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="artists" element={<ArtistsPage />} />
            <Route path="movements" element={<StockMovementsPage />} />
            <Route path="reorder" element={<ReorderPage />} />
            <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="purchase-orders/new" element={<PurchaseOrderCreatePage />} />
            <Route path="purchase-orders/:poId" element={<PurchaseOrderDetailPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="finances" element={<FinancesPage />} />
            <Route path="finances/journal" element={<PaymentJournalPage />} />
            <Route path="finances/impayes" element={<OverdueInvoicesPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="supplier-sales" element={<SupplierSalesPage />} />
            <Route path="admin/roles" element={<UserRolesPage />} />
            <Route path="admin/settings" element={<SettingsPage />} />
          </Routes>
        </PageLayout>
      </div>
    </NotificationProvider>
  );
}

function BackofficeContent() {
  return (
    <AuthProvider>
      <BackofficeContentInner />
    </AuthProvider>
  );
}

function AppRouter() {
  const location = useLocation();
  const isProRoute = location.pathname.startsWith('/pro');
  const isResetPasswordRoute = location.pathname === '/reset-password';

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

  return (
    <Routes>
      <Route path="/*" element={<BackofficeContent />} />
    </Routes>
  );
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
