import { useState, useRef } from "react";
import { Loader2, Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  exportToXLS,
  generateTemplateXLS,
  parseXLSFile,
  productTemplateColumns,
  customerTemplateColumns,
  supplierTemplateColumns,
  productExportColumns,
  customerExportColumns,
  supplierExportColumns,
  productHeaderMapping,
  customerHeaderMapping,
  supplierHeaderMapping,
} from "@/lib/excel-utils";

type EntityType = 'products' | 'customers' | 'suppliers';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  data: Record<string, unknown>[];
  onImportSuccess: () => void;
}

interface ParsedRow {
  data: Record<string, unknown>;
  status: "valid" | "duplicate" | "invalid";
  message?: string;
}

const entityConfig = {
  products: {
    title: 'Produits',
    templateColumns: productTemplateColumns,
    exportColumns: productExportColumns,
    headerMapping: productHeaderMapping,
    requiredFields: ['sku', 'title'],
    uniqueField: 'sku',
  },
  customers: {
    title: 'Clients',
    templateColumns: customerTemplateColumns,
    exportColumns: customerExportColumns,
    headerMapping: customerHeaderMapping,
    requiredFields: ['email'],
    uniqueField: 'email',
  },
  suppliers: {
    title: 'Fournisseurs',
    templateColumns: supplierTemplateColumns,
    exportColumns: supplierExportColumns,
    headerMapping: supplierHeaderMapping,
    requiredFields: ['name'],
    uniqueField: 'name',
  },
};

export function ImportExportModal({ isOpen, onClose, entityType, data, onImportSuccess }: ImportExportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = entityConfig[entityType];
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleDownloadTemplate = () => {
    generateTemplateXLS(config.templateColumns, `${entityType}_import`);
    toast({ title: "Template téléchargé", description: "Le fichier modèle a été téléchargé" });
  };

  const handleExport = () => {
    if (data.length === 0) {
      toast({ title: "Aucune donnée", description: "Aucune donnée à exporter", variant: "destructive" });
      return;
    }
    exportToXLS(data, config.exportColumns as { key: string; header: string }[], `${entityType}_export_${new Date().toISOString().split('T')[0]}`);
    toast({ title: "Export réussi", description: `${data.length} ${config.title.toLowerCase()} exporté(s)` });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const parsed = await parseXLSFile<Record<string, unknown>>(file, config.headerMapping);
      
      // Validate each row
      const existingValues = new Set(
        data.map(item => String(item[config.uniqueField] || '').toLowerCase())
      );

      const validatedRows: ParsedRow[] = parsed.map(row => {
        // Check required fields
        const missingFields = config.requiredFields.filter(
          field => !row[field] || String(row[field]).trim() === ''
        );

        if (missingFields.length > 0) {
          return {
            data: row,
            status: 'invalid' as const,
            message: `Champs requis manquants: ${missingFields.join(', ')}`,
          };
        }

        // Check for duplicates
        const uniqueValue = String(row[config.uniqueField] || '').toLowerCase();
        if (existingValues.has(uniqueValue)) {
          return {
            data: row,
            status: 'duplicate' as const,
            message: 'Existe déjà',
          };
        }

        return { data: row, status: 'valid' as const };
      });

      setParsedRows(validatedRows);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de lire le fichier", variant: "destructive" });
    }
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      toast({ title: "Erreur", description: "Aucune ligne valide à importer", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const dataToInsert = validRows.map(r => {
        const row = { ...r.data };
        
        // Helper to convert to string safely
        const str = (val: unknown): string | null => val ? String(val) : null;
        const num = (val: unknown): number | null => val ? Number(val) : null;
        
        // Type-specific transformations
        if (entityType === 'products') {
          return {
            sku: str(row.sku) || '',
            title: str(row.title) || '',
            artist_name: str(row.artist_name),
            format: (str(row.format) || 'lp') as 'lp' | '2lp' | '3lp' | 'cd' | 'boxset' | '7inch' | '10inch' | '12inch' | 'cassette' | 'digital',
            selling_price: Number(row.selling_price) || 0,
            cost_price: num(row.cost_price),
            stock: row.stock ? Number(row.stock) : 0,
            stock_threshold: num(row.stock_threshold),
            location: str(row.location),
            barcode: str(row.barcode),
            catalog_number: str(row.catalog_number),
            label_name: str(row.label_name),
            year_released: num(row.year_released),
            country_of_origin: str(row.country_of_origin),
            condition_media: str(row.condition_media) as 'M' | 'NM' | 'VG+' | 'VG' | 'G+' | 'G' | 'F' | 'P' | null,
            condition_sleeve: str(row.condition_sleeve) as 'M' | 'NM' | 'VG+' | 'VG' | 'G+' | 'G' | 'F' | 'P' | null,
            supplier_id: '00000000-0000-0000-0000-000000000000', // Default supplier needed
          };
        } else if (entityType === 'customers') {
          return {
            email: str(row.email) || '',
            first_name: str(row.first_name),
            last_name: str(row.last_name),
            company_name: str(row.company_name),
            customer_type: str(row.customer_type) || 'particulier',
            phone: str(row.phone),
            address: str(row.address),
            address_line_2: str(row.address_line_2),
            city: str(row.city),
            postal_code: str(row.postal_code),
            country: str(row.country),
            vat_number: str(row.vat_number),
            discount_rate: row.discount_rate ? Number(row.discount_rate) / 100 : null,
            payment_terms: num(row.payment_terms),
            notes: str(row.notes),
          };
        } else {
          // suppliers
          return {
            name: str(row.name) || '',
            type: (str(row.type) || 'purchase') as 'consignment' | 'purchase' | 'own' | 'depot_vente',
            email: str(row.email),
            phone: str(row.phone),
            contact_name: str(row.contact_name),
            address: str(row.address),
            city: str(row.city),
            postal_code: str(row.postal_code),
            country: str(row.country),
            commission_rate: row.commission_rate ? Number(row.commission_rate) / 100 : null,
            payment_terms: num(row.payment_terms),
            vat_number: str(row.vat_number),
            iban: str(row.iban),
            bic: str(row.bic),
            website: str(row.website),
            notes: str(row.notes),
          };
        }
      });

      const { error } = await supabase.from(entityType).insert(dataToInsert);
      
      if (error) throw error;

      toast({ 
        title: "Import réussi", 
        description: `${validRows.length} ${config.title.toLowerCase()} importé(s)` 
      });
      
      handleClose();
      onImportSuccess();
    } catch (error: unknown) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'import';
      toast({ title: "Erreur", description: errorMessage, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setFileName("");
    setActiveTab('import');
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const validCount = parsedRows.filter(r => r.status === 'valid').length;
  const duplicateCount = parsedRows.filter(r => r.status === 'duplicate').length;
  const invalidCount = parsedRows.filter(r => r.status === 'invalid').length;

  const getDisplayValue = (row: ParsedRow): string => {
    if (entityType === 'products') return String(row.data.title || row.data.sku || '—');
    if (entityType === 'customers') return String(row.data.email || '—');
    return String(row.data.name || '—');
  };

  const getIdentifier = (row: ParsedRow): string => {
    return String(row.data[config.uniqueField] || '—');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Import / Export {config.title}
          </DialogTitle>
          <DialogDescription>
            Importez ou exportez vos {config.title.toLowerCase()} au format Excel (XLSX)
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import" className="gap-2">
              <Upload className="w-4 h-4" />
              Importer
            </TabsTrigger>
            <TabsTrigger value="export" className="gap-2">
              <Download className="w-4 h-4" />
              Exporter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 py-4">
            {/* Template download */}
            <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div>
                <p className="text-sm font-medium">Template d'import</p>
                <p className="text-xs text-muted-foreground">
                  Téléchargez le modèle Excel pour préparer vos données
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <FileDown className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            </div>

            {/* File upload area */}
            <div 
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              {fileName ? (
                <p className="text-sm font-medium">{fileName}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Cliquez pour sélectionner un fichier Excel (.xlsx, .xls)
                </p>
              )}
            </div>

            {/* Preview */}
            {parsedRows.length > 0 && (
              <div className="space-y-3">
                {/* Summary */}
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1 text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    {validCount} valide(s)
                  </span>
                  {duplicateCount > 0 && (
                    <span className="flex items-center gap-1 text-warning">
                      <AlertTriangle className="w-4 h-4" />
                      {duplicateCount} doublon(s)
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
                        <th className="text-left px-3 py-2">Identifiant</th>
                        <th className="text-left px-3 py-2">Libellé</th>
                        <th className="text-center px-3 py-2">Statut</th>
                        <th className="text-left px-3 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 font-mono text-xs">{getIdentifier(row)}</td>
                          <td className="px-3 py-2 truncate max-w-[200px]">{getDisplayValue(row)}</td>
                          <td className="px-3 py-2 text-center">
                            {row.status === 'valid' && <CheckCircle2 className="w-4 h-4 text-success mx-auto" />}
                            {row.status === 'duplicate' && <AlertTriangle className="w-4 h-4 text-warning mx-auto" />}
                            {row.status === 'invalid' && <XCircle className="w-4 h-4 text-destructive mx-auto" />}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{row.message || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4 py-4">
            <div className="p-6 bg-secondary/50 rounded-lg text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium mb-1">Exporter {data.length} {config.title.toLowerCase()}</p>
              <p className="text-sm text-muted-foreground mb-4">
                Téléchargez toutes vos données au format Excel
              </p>
              <Button onClick={handleExport} disabled={data.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exporter en Excel
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Colonnes exportées :</p>
              <p className="text-muted-foreground">
                {config.exportColumns.map(c => c.header).join(', ')}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
          {activeTab === 'import' && (
            <Button 
              onClick={handleImport} 
              disabled={isImporting || validCount === 0}
            >
              {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importer {validCount} {config.title.toLowerCase()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
