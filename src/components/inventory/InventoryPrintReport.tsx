import { forwardRef } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Product } from "@/hooks/useProducts";

interface InventoryPrintReportProps {
  products: Product[];
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  totalUnits: number;
}

export const InventoryPrintReport = forwardRef<HTMLDivElement, InventoryPrintReportProps>(
  ({ products, lowStockProducts, outOfStockProducts, totalUnits }, ref) => {
    const today = format(new Date(), "d MMMM yyyy 'à' HH:mm", { locale: fr });

    const getStockStatus = (product: Product) => {
      const stock = product.stock ?? 0;
      const threshold = product.stock_threshold ?? 5;
      if (stock === 0) return "rupture";
      if (stock <= threshold) return "low";
      return "ok";
    };

    return (
      <div ref={ref} className="print-report bg-white text-black p-8 hidden print:block">
        <style>{`
          @media print {
            .print-report { display: block !important; }
            body * { visibility: hidden; }
            .print-report, .print-report * { visibility: visible; }
            .print-report { position: absolute; left: 0; top: 0; width: 100%; }
            @page { margin: 1cm; size: A4; }
          }
          .print-report table { border-collapse: collapse; width: 100%; font-size: 10px; }
          .print-report th, .print-report td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          .print-report th { background: #f5f5f5; font-weight: 600; }
          .print-report .rupture { background: #fee2e2; }
          .print-report .low { background: #fef3c7; }
          .print-report h1 { font-size: 20px; margin-bottom: 4px; }
          .print-report h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #000; padding-bottom: 4px; }
          .print-report .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
          .print-report .summary-card { border: 1px solid #ddd; padding: 12px; text-align: center; }
          .print-report .summary-value { font-size: 24px; font-weight: bold; }
          .print-report .summary-label { font-size: 11px; color: #666; }
          .print-report .page-break { page-break-before: always; }
        `}</style>

        {/* Header */}
        <div className="mb-6">
          <h1>Rapport d'inventaire</h1>
          <p className="text-gray-600 text-sm">Généré le {today}</p>
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-value">{totalUnits}</div>
            <div className="summary-label">Unités en stock</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{products.length}</div>
            <div className="summary-label">Références</div>
          </div>
          <div className="summary-card">
            <div className="summary-value" style={{ color: '#d97706' }}>{lowStockProducts.length}</div>
            <div className="summary-label">Stock faible</div>
          </div>
          <div className="summary-card">
            <div className="summary-value" style={{ color: '#dc2626' }}>{outOfStockProducts.length}</div>
            <div className="summary-label">Ruptures</div>
          </div>
        </div>

        {/* Alerts Section */}
        {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
          <>
            <h2>⚠️ Alertes de stock</h2>
            
            {outOfStockProducts.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#dc2626' }}>
                  Ruptures de stock ({outOfStockProducts.length})
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>SKU</th>
                      <th style={{ width: '35%' }}>Produit</th>
                      <th style={{ width: '20%' }}>Artiste</th>
                      <th style={{ width: '15%' }}>Emplacement</th>
                      <th style={{ width: '15%' }}>Fournisseur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outOfStockProducts.map(product => (
                      <tr key={product.id} className="rupture">
                        <td className="font-mono">{product.sku}</td>
                        <td>{product.title}</td>
                        <td>{product.artist_name || '—'}</td>
                        <td>{product.location || '—'}</td>
                        <td>{product.supplier_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {lowStockProducts.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#d97706' }}>
                  Stock faible ({lowStockProducts.length})
                </h3>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }}>SKU</th>
                      <th style={{ width: '30%' }}>Produit</th>
                      <th style={{ width: '15%' }}>Artiste</th>
                      <th style={{ width: '10%' }}>Stock</th>
                      <th style={{ width: '10%' }}>Seuil</th>
                      <th style={{ width: '10%' }}>Emplacement</th>
                      <th style={{ width: '10%' }}>Fournisseur</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.map(product => (
                      <tr key={product.id} className="low">
                        <td className="font-mono">{product.sku}</td>
                        <td>{product.title}</td>
                        <td>{product.artist_name || '—'}</td>
                        <td className="text-center font-bold">{product.stock ?? 0}</td>
                        <td className="text-center">{product.stock_threshold ?? 5}</td>
                        <td>{product.location || '—'}</td>
                        <td>{product.supplier_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Full Inventory */}
        <div className="page-break">
          <h2>📦 Inventaire complet ({products.length} références)</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: '12%' }}>SKU</th>
                <th style={{ width: '28%' }}>Produit</th>
                <th style={{ width: '15%' }}>Artiste</th>
                <th style={{ width: '8%' }}>Format</th>
                <th style={{ width: '8%' }}>Stock</th>
                <th style={{ width: '8%' }}>Seuil</th>
                <th style={{ width: '10%' }}>Emplacement</th>
                <th style={{ width: '11%' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const status = getStockStatus(product);
                return (
                  <tr key={product.id} className={status === "rupture" ? "rupture" : status === "low" ? "low" : ""}>
                    <td className="font-mono">{product.sku}</td>
                    <td>{product.title}</td>
                    <td>{product.artist_name || '—'}</td>
                    <td className="uppercase">{product.format}</td>
                    <td className="text-center font-bold">{product.stock ?? 0}</td>
                    <td className="text-center">{product.stock_threshold ?? 5}</td>
                    <td>{product.location || '—'}</td>
                    <td className="text-center">
                      {status === "rupture" ? "RUPTURE" : status === "low" ? "FAIBLE" : "OK"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          Rapport généré automatiquement — {today}
        </div>
      </div>
    );
  }
);

InventoryPrintReport.displayName = "InventoryPrintReport";
