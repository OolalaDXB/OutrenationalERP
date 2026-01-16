import { useState, useRef } from "react";
import { Loader2, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "@/hooks/use-toast";

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  sku: string;
  newStock: number;
  productId?: string;
  productTitle?: string;
  currentStock?: number;
  status: "valid" | "not_found" | "invalid";
  message?: string;
}

/**
 * CSV Import Modal - now shows informational message
 * Direct stock updates are forbidden - stock is managed via order_items
 */
export function CSVImportModal({ isOpen, onClose, onSuccess }: CSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: products = [] } = useProducts();
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    // Skip header row
    const dataLines = lines.slice(1);
    
    return dataLines.map(line => {
      // Handle both comma and semicolon separators
      const separator = line.includes(";") ? ";" : ",";
      const parts = line.split(separator).map(p => p.replace(/^"|"$/g, '').trim());
      
      const sku = parts[0] || "";
      const stockValue = parts[3] || parts[1]; // Stock is usually column 4 (index 3) or column 2 (index 1)
      const newStock = parseInt(stockValue, 10);

      if (!sku) {
        return { sku: "", newStock: 0, status: "invalid" as const, message: "SKU manquant" };
      }

      if (isNaN(newStock) || newStock < 0) {
        return { sku, newStock: 0, status: "invalid" as const, message: "Stock invalide" };
      }

      // Find matching product
      const product = products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
      
      if (!product) {
        return { sku, newStock, status: "not_found" as const, message: "Produit non trouvé" };
      }

      return {
        sku,
        newStock,
        productId: product.id,
        productTitle: product.title,
        currentStock: product.stock ?? 0,
        status: "valid" as const
      };
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const rows = parseCSV(content);
      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const validCount = parsedRows.filter(r => r.status === "valid").length;
  const notFoundCount = parsedRows.filter(r => r.status === "not_found").length;
  const invalidCount = parsedRows.filter(r => r.status === "invalid").length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importer depuis CSV
          </DialogTitle>
          <DialogDescription>
            Prévisualisation du fichier CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning message */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-sm">Import CSV désactivé</p>
              <p className="text-sm text-muted-foreground">
                Les modifications directes de stock ne sont plus autorisées.
                Le stock est géré automatiquement via les commandes.
              </p>
              <p className="text-sm text-muted-foreground">
                Vous pouvez toujours prévisualiser votre fichier CSV ci-dessous.
              </p>
            </div>
          </div>

          {/* File upload area */}
          <div 
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            {fileName ? (
              <p className="text-sm font-medium">{fileName}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cliquez pour sélectionner un fichier CSV (prévisualisation uniquement)
              </p>
            )}
          </div>

          {/* Format hint */}
          <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Format attendu :</p>
            <code className="block bg-background rounded px-2 py-1">
              SKU;Titre;Artiste;Stock;...
            </code>
          </div>

          {/* Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  {validCount} trouvé(s)
                </span>
                {notFoundCount > 0 && (
                  <span className="flex items-center gap-1 text-warning">
                    <AlertTriangle className="w-4 h-4" />
                    {notFoundCount} non trouvé(s)
                  </span>
                )}
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <XCircle className="w-4 h-4" />
                    {invalidCount} invalide(s)
                  </span>
                )}
              </div>

              {/* Rows preview */}
              <ScrollArea className="h-48 border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">SKU</th>
                      <th className="text-left px-3 py-2">Produit</th>
                      <th className="text-right px-3 py-2">Stock actuel</th>
                      <th className="text-right px-3 py-2">CSV</th>
                      <th className="text-center px-3 py-2">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs">{row.sku || '—'}</td>
                        <td className="px-3 py-2 truncate max-w-[120px]">
                          {row.productTitle || row.message || '—'}
                        </td>
                        <td className="px-3 py-2 text-right">{row.currentStock ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-medium">{row.newStock}</td>
                        <td className="px-3 py-2 text-center">
                          {row.status === "valid" && <CheckCircle2 className="w-4 h-4 text-success mx-auto" />}
                          {row.status === "not_found" && <AlertTriangle className="w-4 h-4 text-warning mx-auto" />}
                          {row.status === "invalid" && <XCircle className="w-4 h-4 text-destructive mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}