import { useState, useCallback } from "react";
import { Upload, Download, X, FileSpreadsheet, AlertTriangle, CheckCircle, Loader2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { generateTemplateXLS, parseXLSFile } from "@/lib/excel-utils";
import { orderTemplateColumns, orderHeaderMapping } from "@/lib/order-import-utils";
import { useImportOrders, ParsedOrder, ParsedOrderItem, ImportWarning } from "@/hooks/useImportOrders";
import { useOrdersWithItems } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";

interface OrderImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function OrderImportModal({ isOpen, onClose, onSuccess }: OrderImportModalProps) {
  const [activeTab, setActiveTab] = useState("import");
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<{
    orders: ParsedOrder[];
    items: ParsedOrderItem[];
    warnings: ImportWarning[];
  } | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [updateExisting, setUpdateExisting] = useState(false);
  
  const { data: existingOrders = [] } = useOrdersWithItems();
  const { data: products = [] } = useProducts();
  const { parseOrdersFile, importOrders, isImporting } = useImportOrders();

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setSkipDuplicates(true);
    setUpdateExisting(false);
    setActiveTab("import");
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsParsing(true);
    setParsedData(null);
    
    try {
      const rows = await parseXLSFile<Record<string, unknown>>(selectedFile, orderHeaderMapping);
      const existingOrderNumbers = existingOrders.map(o => o.order_number);
      const existingSkus = products.map(p => p.sku);
      
      const result = await parseOrdersFile(rows, existingOrderNumbers, existingSkus);
      setParsedData(result);
      
      if (result.orders.length === 0) {
        toast({
          title: "Fichier vide",
          description: "Aucune commande valide trouvée dans le fichier",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur de lecture",
        description: error instanceof Error ? error.message : "Impossible de lire le fichier",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;
    
    const result = await importOrders(
      parsedData.orders,
      parsedData.items,
      { skipDuplicates, updateExisting }
    );
    
    if (result.errors.length > 0) {
      toast({
        title: "Import terminé avec erreurs",
        description: `${result.created} créées, ${result.updated} mises à jour, ${result.errors.length} erreurs`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Import réussi",
        description: `${result.created} commandes créées, ${result.updated} mises à jour, ${result.skipped} ignorées`,
      });
      onSuccess?.();
      handleClose();
    }
  };

  const handleDownloadTemplate = () => {
    generateTemplateXLS(orderTemplateColumns, "commandes");
    toast({ title: "Template téléchargé", description: "Le fichier modèle a été téléchargé" });
  };

  const duplicateCount = parsedData?.warnings.filter(w => w.type === 'duplicate_order').length || 0;
  const unknownSkuCount = parsedData?.warnings.filter(w => w.type === 'unknown_sku').length || 0;
  const totalItems = parsedData?.items.length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import de commandes
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Importer</TabsTrigger>
            <TabsTrigger value="help">Format & Aide</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            {/* File Upload */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="order-file-upload"
              />
              <label htmlFor="order-file-upload" className="cursor-pointer">
                {isParsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Analyse du fichier...</span>
                  </div>
                ) : file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-primary" />
                    <span className="font-medium">{file.name}</span>
                    <button
                      onClick={(e) => { e.preventDefault(); setFile(null); setParsedData(null); }}
                      className="p-1 hover:bg-secondary rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Cliquez pour sélectionner un fichier XLS/XLSX/CSV
                    </span>
                  </div>
                )}
              </label>
            </div>

            {/* Preview */}
            {parsedData && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{parsedData.orders.length}</div>
                    <div className="text-xs text-muted-foreground">Commandes</div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{totalItems}</div>
                    <div className="text-xs text-muted-foreground">Articles</div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3 text-center">
                    <div className={`text-2xl font-bold ${parsedData.warnings.length > 0 ? 'text-warning' : 'text-success'}`}>
                      {parsedData.warnings.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Avertissements</div>
                  </div>
                </div>

                {/* Warnings */}
                {parsedData.warnings.length > 0 && (
                  <ScrollArea className="flex-1 max-h-40 border rounded-lg">
                    <div className="p-3 space-y-2">
                      {parsedData.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{warning.message}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Options */}
                {duplicateCount > 0 && (
                  <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
                    <p className="text-sm font-medium">
                      {duplicateCount} commande(s) existe(nt) déjà
                    </p>
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={skipDuplicates}
                          onCheckedChange={(checked) => {
                            setSkipDuplicates(!!checked);
                            if (checked) setUpdateExisting(false);
                          }}
                        />
                        <span className="text-sm">Ignorer les doublons</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={updateExisting}
                          onCheckedChange={(checked) => {
                            setUpdateExisting(!!checked);
                            if (checked) setSkipDuplicates(false);
                          }}
                        />
                        <span className="text-sm">Mettre à jour les commandes existantes</span>
                      </label>
                    </div>
                  </div>
                )}

                {unknownSkuCount > 0 && (
                  <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                    <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <p className="text-sm text-warning">
                      {unknownSkuCount} SKU inconnu(s) seront créés comme articles sans produit lié
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                Télécharger template
              </Button>
              <div className="flex-1" />
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleImport}
                disabled={!parsedData || parsedData.orders.length === 0 || isImporting}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Importer {parsedData?.orders.length || 0} commande(s)
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="help" className="flex-1 overflow-auto mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-6 pr-4">
                <div>
                  <h3 className="font-semibold mb-2">Colonnes requises</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><code className="bg-secondary px-1 rounded">order_number</code> - Numéro de commande (unique)</li>
                    <li><code className="bg-secondary px-1 rounded">order_date</code> - Date (ISO ou DD/MM/YYYY)</li>
                    <li><code className="bg-secondary px-1 rounded">customer_email</code> - Email du client</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Colonnes optionnelles</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li><code className="bg-secondary px-1 rounded">customer_name</code> - Nom du client</li>
                    <li><code className="bg-secondary px-1 rounded">shipping_address</code> - Adresse</li>
                    <li><code className="bg-secondary px-1 rounded">shipping_city</code> - Ville</li>
                    <li><code className="bg-secondary px-1 rounded">shipping_postal_code</code> - Code postal</li>
                    <li><code className="bg-secondary px-1 rounded">shipping_country</code> - Pays</li>
                    <li><code className="bg-secondary px-1 rounded">status</code> - Statut (delivered, shipped, etc.)</li>
                    <li><code className="bg-secondary px-1 rounded">payment_status</code> - Paiement (paid, pending)</li>
                    <li><code className="bg-secondary px-1 rounded">source</code> - Source (Discogs, Bandcamp...)</li>
                    <li><code className="bg-secondary px-1 rounded">notes</code> - Notes internes</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Format A - Une ligne par article</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Chaque article est sur sa propre ligne. Les infos de commande sont répétées.
                  </p>
                  <div className="bg-secondary/50 p-3 rounded-lg overflow-x-auto">
                    <table className="text-xs">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 text-left">order_number</th>
                          <th className="px-2 py-1 text-left">customer_email</th>
                          <th className="px-2 py-1 text-left">product_sku</th>
                          <th className="px-2 py-1 text-left">quantity</th>
                          <th className="px-2 py-1 text-left">unit_price</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">ORD-001</td>
                          <td className="px-2 py-1">client@email.com</td>
                          <td className="px-2 py-1">VIA01LP</td>
                          <td className="px-2 py-1">1</td>
                          <td className="px-2 py-1">27.00</td>
                        </tr>
                        <tr>
                          <td className="px-2 py-1">ORD-001</td>
                          <td className="px-2 py-1">client@email.com</td>
                          <td className="px-2 py-1">MRP045</td>
                          <td className="px-2 py-1">2</td>
                          <td className="px-2 py-1">24.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Format B - Articles groupés</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Articles dans une seule colonne, séparés par point-virgule.
                    Format: <code>SKU:quantité:prix</code>
                  </p>
                  <div className="bg-secondary/50 p-3 rounded-lg overflow-x-auto">
                    <table className="text-xs">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 text-left">order_number</th>
                          <th className="px-2 py-1 text-left">customer_email</th>
                          <th className="px-2 py-1 text-left">items</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="px-2 py-1">ORD-001</td>
                          <td className="px-2 py-1">client@email.com</td>
                          <td className="px-2 py-1">VIA01LP:1:27.00;MRP045:2:24.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Les clients sont créés automatiquement s'ils n'existent pas</li>
                    <li>• Les SKU inconnus créent des articles sans produit lié</li>
                    <li>• Le statut par défaut est "delivered" et le paiement "paid"</li>
                    <li>• Les totaux sont calculés automatiquement</li>
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
