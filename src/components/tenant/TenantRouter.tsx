import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { TenantProvider } from '@/contexts/TenantContext';
import { useTenant } from '@/hooks/useTenant';
import { TenantNotFound } from '@/components/tenant/TenantNotFound';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ProAuthProvider } from '@/hooks/useProAuth';
import { CartProvider } from '@/hooks/useCart';
import { NotificationProvider } from '@/hooks/use-notifications';

// Backoffice pages
import { Dashboard } from '@/pages/Dashboard';
import { OrdersPage } from '@/pages/Orders';
import { SuppliersPage } from '@/pages/Suppliers';
import { ProductsPage } from '@/pages/Products';
import { InventoryPage } from '@/pages/Inventory';
import { CustomersPage } from '@/pages/Customers';
import { ArtistsPage } from '@/pages/Artists';
import { LabelsPage } from '@/pages/Labels';
import { SupplierSalesPage } from '@/pages/SupplierSales';
import { ReorderPage } from '@/pages/Reorder';
import { InvoicesPage } from '@/pages/Invoices';
import { AnalyticsPage } from '@/pages/Analytics';
import { StockMovementsPage } from '@/pages/StockMovements';
import { UserRolesPage } from '@/pages/UserRoles';
import FinancesPage from '@/pages/Finances';
import PaymentJournalPage from '@/pages/finances/PaymentJournal';
import OverdueInvoicesPage from '@/pages/finances/OverdueInvoices';
import { PurchaseOrdersPage } from '@/pages/PurchaseOrders';
import { PurchaseOrderCreatePage } from '@/pages/PurchaseOrderCreate';
import { PurchaseOrderDetailPage } from '@/pages/PurchaseOrderDetail';
import { SettingsPage } from '@/pages/Settings';

// Pro pages
import { ProLayout } from '@/components/pro/ProLayout';
import { ProLogin } from '@/pages/pro/ProLogin';
import { ProRegister } from '@/pages/pro/ProRegister';
import { ProPendingApproval } from '@/pages/pro/ProPendingApproval';
import { ProCompleteProfile } from '@/pages/pro/ProCompleteProfile';
import { ProDashboard } from '@/pages/pro/ProDashboard';
import { ProCatalog } from '@/pages/pro/ProCatalog';
import { ProCart } from '@/pages/pro/ProCart';
import { ProCheckout } from '@/pages/pro/ProCheckout';
import { ProOrderSuccess } from '@/pages/pro/ProOrderSuccess';
import { ProOrders } from '@/pages/pro/ProOrders';
import { ProInvoices } from '@/pages/pro/ProInvoices';
import { ProAccount } from '@/pages/pro/ProAccount';

// Layout
import { TenantBackofficeLayout } from '@/components/tenant/TenantBackofficeLayout';

function TenantContent() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const { data: tenant, isLoading, error } = useTenant(tenantSlug);
  const { loading: authLoading, user } = useAuth();

  // Redirect to login when user signs out
  if (!authLoading && !user) {
    navigate('/login', { replace: true });
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage === 'ACCESS_DENIED') {
      return <TenantNotFound type="access-denied" />;
    }
    return <TenantNotFound type="not-found" />;
  }

  if (!tenant) {
    return <TenantNotFound type="not-found" />;
  }

  return (
    <TenantProvider value={tenant}>
      <Routes>
        {/* Backoffice routes */}
        <Route path="/" element={<TenantBackofficeLayout><Dashboard /></TenantBackofficeLayout>} />
        <Route path="/orders" element={<TenantBackofficeLayout><OrdersPage /></TenantBackofficeLayout>} />
        <Route path="/products" element={<TenantBackofficeLayout><ProductsPage /></TenantBackofficeLayout>} />
        <Route path="/suppliers" element={<TenantBackofficeLayout><SuppliersPage /></TenantBackofficeLayout>} />
        <Route path="/labels" element={<TenantBackofficeLayout><LabelsPage /></TenantBackofficeLayout>} />
        <Route path="/inventory" element={<TenantBackofficeLayout><InventoryPage /></TenantBackofficeLayout>} />
        <Route path="/customers" element={<TenantBackofficeLayout><CustomersPage /></TenantBackofficeLayout>} />
        <Route path="/artists" element={<TenantBackofficeLayout><ArtistsPage /></TenantBackofficeLayout>} />
        <Route path="/movements" element={<TenantBackofficeLayout><StockMovementsPage /></TenantBackofficeLayout>} />
        <Route path="/reorder" element={<TenantBackofficeLayout><ReorderPage /></TenantBackofficeLayout>} />
        <Route path="/purchase-orders" element={<TenantBackofficeLayout><PurchaseOrdersPage /></TenantBackofficeLayout>} />
        <Route path="/purchase-orders/new" element={<TenantBackofficeLayout><PurchaseOrderCreatePage /></TenantBackofficeLayout>} />
        <Route path="/purchase-orders/:poId" element={<TenantBackofficeLayout><PurchaseOrderDetailPage /></TenantBackofficeLayout>} />
        <Route path="/invoices" element={<TenantBackofficeLayout><InvoicesPage /></TenantBackofficeLayout>} />
        <Route path="/finances" element={<TenantBackofficeLayout><FinancesPage /></TenantBackofficeLayout>} />
        <Route path="/finances/journal" element={<TenantBackofficeLayout><PaymentJournalPage /></TenantBackofficeLayout>} />
        <Route path="/finances/impayes" element={<TenantBackofficeLayout><OverdueInvoicesPage /></TenantBackofficeLayout>} />
        <Route path="/analytics" element={<TenantBackofficeLayout><AnalyticsPage /></TenantBackofficeLayout>} />
        <Route path="/supplier-sales" element={<TenantBackofficeLayout><SupplierSalesPage /></TenantBackofficeLayout>} />
        <Route path="/admin/roles" element={<TenantBackofficeLayout><UserRolesPage /></TenantBackofficeLayout>} />
        <Route path="/admin/settings" element={<TenantBackofficeLayout><SettingsPage /></TenantBackofficeLayout>} />

        {/* Pro portal routes */}
        <Route path="/pro/*" element={
          <ProAuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/login" element={<ProLogin />} />
                <Route path="/register" element={<ProRegister />} />
                <Route path="/pending" element={<ProPendingApproval />} />
                <Route path="/complete-profile" element={<ProCompleteProfile />} />
                <Route path="/*" element={<ProLayout />}>
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
        } />
      </Routes>
    </TenantProvider>
  );
}

export function TenantRouter() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <TenantContent />
      </NotificationProvider>
    </AuthProvider>
  );
}
