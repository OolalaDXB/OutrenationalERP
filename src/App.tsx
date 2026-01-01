import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageLayout } from "@/components/layout/PageLayout";
import { Dashboard } from "@/pages/Dashboard";
import { OrdersPage } from "@/pages/Orders";
import { SuppliersPage } from "@/pages/Suppliers";
import { ProductsPage } from "@/pages/Products";
import { InventoryPage } from "@/pages/Inventory";
import { CustomersPage } from "@/pages/Customers";
import { PlaceholderPage } from "@/pages/PlaceholderPage";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "Dashboard", subtitle: "Vue d'ensemble" },
  "/orders": { title: "Commandes", subtitle: "Gestion des commandes" },
  "/products": { title: "Produits", subtitle: "Catalogue produits" },
  "/suppliers": { title: "Fournisseurs", subtitle: "Gestion fournisseurs" },
  "/artists": { title: "Artistes", subtitle: "Catalogue artistes" },
  "/inventory": { title: "Inventaire", subtitle: "État des stocks" },
  "/movements": { title: "Mouvements", subtitle: "Historique stock" },
  "/reorder": { title: "Réapprovisionnement", subtitle: "Commandes fournisseurs" },
  "/customers": { title: "Clients", subtitle: "Base clients" },
  "/invoices": { title: "Factures", subtitle: "Facturation" },
  "/analytics": { title: "Analytics", subtitle: "Statistiques" },
  "/supplier-sales": { title: "Ventes par fournisseur", subtitle: "Rapports" },
};

function App() {
  const [currentPath, setCurrentPath] = useState("/");

  const renderPage = () => {
    switch (currentPath) {
      case "/": return <Dashboard />;
      case "/orders": return <OrdersPage />;
      case "/products": return <ProductsPage />;
      case "/suppliers": return <SuppliersPage />;
      case "/inventory": return <InventoryPage />;
      case "/customers": return <CustomersPage />;
      case "/artists": return <PlaceholderPage title="Artistes" />;
      case "/movements": return <PlaceholderPage title="Mouvements de stock" />;
      case "/reorder": return <PlaceholderPage title="Réapprovisionnement" />;
      case "/invoices": return <PlaceholderPage title="Factures" />;
      case "/analytics": return <PlaceholderPage title="Analytics" />;
      case "/supplier-sales": return <PlaceholderPage title="Ventes par fournisseur" />;
      default: return <Dashboard />;
    }
  };

  const pageInfo = pageTitles[currentPath] || { title: "Dashboard" };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar currentPath={currentPath} onNavigate={setCurrentPath} />
      <PageLayout title={pageInfo.title} subtitle={pageInfo.subtitle}>
        {renderPage()}
      </PageLayout>
    </div>
  );
}

export default App;
