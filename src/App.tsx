import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";

// Sillon pages
import { SillonLanding } from "@/pages/SillonLanding";
import { SillonLogin } from "@/pages/SillonLogin";
import { ResetPasswordPage } from "@/pages/ResetPassword";

// Tenant router
import { TenantRouter } from "@/components/tenant/TenantRouter";

// Legacy redirects for backward compatibility
import { RedirectToTenantPro, RedirectToTenantBackoffice } from "@/components/tenant/LegacyRedirects";

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

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* ========== Sillon Public Pages ========== */}
            <Route path="/" element={<SillonLanding />} />
            <Route path="/login" element={<SillonLogin />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* ========== Tenant-Scoped Routes ========== */}
            <Route path="/t/:tenantSlug/*" element={<TenantRouter />} />

            {/* ========== Legacy Redirects (Backward Compatibility) ========== */}
            {/* These will be removed once traffic logs show 0 usage for 30 days */}
            
            {/* Old Pro portal routes */}
            <Route path="/pro/*" element={<RedirectToTenantPro />} />
            <Route path="/pro" element={<RedirectToTenantPro />} />

            {/* Old backoffice routes - redirect to outre-national tenant */}
            <Route path="/orders" element={<RedirectToTenantBackoffice />} />
            <Route path="/products" element={<RedirectToTenantBackoffice />} />
            <Route path="/suppliers" element={<RedirectToTenantBackoffice />} />
            <Route path="/labels" element={<RedirectToTenantBackoffice />} />
            <Route path="/inventory" element={<RedirectToTenantBackoffice />} />
            <Route path="/customers" element={<RedirectToTenantBackoffice />} />
            <Route path="/artists" element={<RedirectToTenantBackoffice />} />
            <Route path="/movements" element={<RedirectToTenantBackoffice />} />
            <Route path="/reorder" element={<RedirectToTenantBackoffice />} />
            <Route path="/purchase-orders/*" element={<RedirectToTenantBackoffice />} />
            <Route path="/invoices" element={<RedirectToTenantBackoffice />} />
            <Route path="/finances/*" element={<RedirectToTenantBackoffice />} />
            <Route path="/analytics" element={<RedirectToTenantBackoffice />} />
            <Route path="/supplier-sales" element={<RedirectToTenantBackoffice />} />
            <Route path="/admin/*" element={<RedirectToTenantBackoffice />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
