import { useState, useRef, useMemo } from "react";
import { Loader2, Upload, Download, FileSpreadsheet, XCircle, AlertTriangle, FileDown, RefreshCw, Plus, Eye, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreateImportHistory } from "@/hooks/useImportHistory";
import { useSuppliers } from "@/hooks/useSuppliers";
import {
  exportToXLS,
  generateTemplateXLS,
  parseXLSFile,
  productTemplateColumns,
  customerTemplateColumns,
  supplierTemplateColumns,
  labelTemplateColumns,
  productExportColumns,
  customerExportColumns,
  supplierExportColumns,
  labelExportColumns,
  productHeaderMapping,
  customerHeaderMapping,
  supplierHeaderMapping,
  labelHeaderMapping,
} from "@/lib/excel-utils";
import { ChangesPreviewModal, fieldLabels } from "./ChangesPreviewModal";

type EntityType = 'products' | 'customers' | 'suppliers' | 'labels';
type ImportMode = 'insert' | 'update';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EntityType;
  data: Record<string, unknown>[];
  onImportSuccess: () => void;
}

interface ParsedRow {
  data: Record<string, unknown>;
  status: "valid" | "duplicate" | "invalid" | "update";
  existingId?: string;
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
    uniqueFieldLabel: 'SKU',
  },
  customers: {
    title: 'Clients',
    templateColumns: customerTemplateColumns,
    exportColumns: customerExportColumns,
    headerMapping: customerHeaderMapping,
    requiredFields: ['email'],
    uniqueField: 'email',
    uniqueFieldLabel: 'Email',
  },
  suppliers: {
    title: 'Fournisseurs',
    templateColumns: supplierTemplateColumns,
    exportColumns: supplierExportColumns,
    headerMapping: supplierHeaderMapping,
    requiredFields: ['name'],
    uniqueField: 'name',
    uniqueFieldLabel: 'Nom',
  },
  labels: {
    title: 'Labels',
    templateColumns: labelTemplateColumns,
    exportColumns: labelExportColumns,
    headerMapping: labelHeaderMapping,
    requiredFields: ['name'],
    uniqueField: 'name',
    uniqueFieldLabel: 'Nom',
  },
};

export function ImportExportModal({ isOpen, onClose, entityType, data, onImportSuccess }: ImportExportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = entityConfig[entityType];
  const createImportHistory = useCreateImportHistory();
  const { data: suppliers = [] } = useSuppliers();
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [importMode, setImportMode] = useState<ImportMode>('insert');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [showChangesPreview, setShowChangesPreview] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

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
      
      // Build a map of existing records by unique field
      const existingMap = new Map<string, string>();
      data.forEach(item => {
        const key = String(item[config.uniqueField] || '').toLowerCase();
        if (key && item.id) {
          existingMap.set(key, String(item.id));
        }
      });

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

        // Check for existing records
        const uniqueValue = String(row[config.uniqueField] || '').toLowerCase();
        const existingId = existingMap.get(uniqueValue);
        
        if (existingId) {
          if (importMode === 'update') {
            return {
              data: row,
              status: 'update' as const,
              existingId,
              message: 'Sera mis à jour',
            };
          } else {
            return {
              data: row,
              status: 'duplicate' as const,
              existingId,
              message: 'Existe déjà (ignoré)',
            };
          }
        }

        return { data: row, status: 'valid' as const };
      });

      setParsedRows(validatedRows);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de lire le fichier", variant: "destructive" });
    }
  };

  // Re-validate rows when import mode changes
  const revalidateRows = () => {
    if (parsedRows.length === 0) return;
    
    const existingMap = new Map<string, string>();
    data.forEach(item => {
      const key = String(item[config.uniqueField] || '').toLowerCase();
      if (key && item.id) {
        existingMap.set(key, String(item.id));
      }
    });

    const revalidated = parsedRows.map(row => {
      // Keep invalid rows as-is
      if (row.status === 'invalid') return row;
      
      const uniqueValue = String(row.data[config.uniqueField] || '').toLowerCase();
      const existingId = existingMap.get(uniqueValue);
      
      if (existingId) {
        if (importMode === 'update') {
          return {
            ...row,
            status: 'update' as const,
            existingId,
            message: 'Sera mis à jour',
          };
        } else {
          return {
            ...row,
            status: 'duplicate' as const,
            existingId,
            message: 'Existe déjà (ignoré)',
          };
        }
      }
      
      return { ...row, status: 'valid' as const, existingId: undefined, message: undefined };
    });
    
    setParsedRows(revalidated);
  };

  const handleImport = async () => {
    const rowsToProcess = importMode === 'update' 
      ? parsedRows.filter(r => r.status === 'valid' || r.status === 'update')
      : parsedRows.filter(r => r.status === 'valid');
      
    if (rowsToProcess.length === 0) {
      toast({ title: "Erreur", description: "Aucune ligne à traiter", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      // Helper to convert to string safely
      const str = (val: unknown): string | null => val ? String(val) : null;
      const num = (val: unknown): number | null => val ? Number(val) : null;
      
      const transformRow = (row: Record<string, unknown>) => {
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
            supplier_id: '00000000-0000-0000-0000-000000000000',
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
        } else if (entityType === 'suppliers') {
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
        } else {
          // Labels
          return {
            name: str(row.name) || '',
            country: str(row.country),
            website: str(row.website),
            discogs_id: str(row.discogs_id),
            supplier_id: selectedSupplierId || null,
          };
        }
      };

      let insertedCount = 0;
      let updatedCount = 0;
      const createdRecordIds: string[] = [];

      // Process inserts (new records)
      const rowsToInsert = rowsToProcess.filter(r => r.status === 'valid');
      if (rowsToInsert.length > 0) {
        const dataToInsert = rowsToInsert.map(r => transformRow(r.data));
        const { data: insertedData, error } = await supabase
          .from(entityType)
          .insert(dataToInsert)
          .select('id');
        if (error) throw error;
        insertedCount = rowsToInsert.length;
        
        // Collect created record IDs
        if (insertedData) {
          createdRecordIds.push(...insertedData.map(r => r.id));
        }
      }

      // Process updates (existing records)
      if (importMode === 'update') {
        const rowsToUpdate = rowsToProcess.filter(r => r.status === 'update' && r.existingId);
        for (const row of rowsToUpdate) {
          const updateData = transformRow(row.data);
          // Remove fields that shouldn't be updated
          if (entityType === 'products') {
            delete (updateData as Record<string, unknown>).supplier_id;
          }
          const { error } = await supabase
            .from(entityType)
            .update(updateData)
            .eq('id', row.existingId!);
          if (error) throw error;
          updatedCount++;
        }
      }

      // Save import history
      if (insertedCount > 0 || updatedCount > 0) {
        await createImportHistory.mutateAsync({
          entityType,
          fileName: fileName || undefined,
          recordsCreated: insertedCount,
          recordsUpdated: updatedCount,
          createdRecordIds,
        });
      }

      const messages: string[] = [];
      if (insertedCount > 0) messages.push(`${insertedCount} ajouté(s)`);
      if (updatedCount > 0) messages.push(`${updatedCount} mis à jour`);
      
      toast({ 
        title: "Import réussi", 
        description: messages.join(', ') || 'Aucune modification'
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
    setImportMode('insert');
    setShowChangesPreview(false);
    setSelectedSupplierId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const handleModeChange = (mode: ImportMode) => {
    setImportMode(mode);
    // Revalidate after state update
    setTimeout(revalidateRows, 0);
  };

  // Calculate changes for preview
  const recordChanges = useMemo(() => {
    const rowsToUpdate = parsedRows.filter(r => r.status === 'update' && r.existingId);
    const labels = fieldLabels[entityType] || {};
    
    return rowsToUpdate.map(row => {
      const existingRecord = data.find(d => d.id === row.existingId);
      if (!existingRecord) return null;
      
      const changes: { field: string; label: string; oldValue: string | number | null; newValue: string | number | null }[] = [];
      
      // Compare fields
      const fieldsToCompare = Object.keys(labels);
      for (const field of fieldsToCompare) {
        const oldVal = existingRecord[field];
        const newVal = row.data[field];
        
        // Normalize for comparison
        const normalizeVal = (v: unknown): string => {
          if (v === null || v === undefined || v === '') return '';
          return String(v).trim();
        };
        
        if (normalizeVal(oldVal) !== normalizeVal(newVal) && newVal !== undefined) {
          changes.push({
            field,
            label: labels[field] || field,
            oldValue: oldVal as string | number | null,
            newValue: newVal as string | number | null,
          });
        }
      }
      
      if (changes.length === 0) return null;
      
      return {
        identifier: String(row.data[config.uniqueField] || ''),
        displayName: entityType === 'products' 
          ? String(row.data.title || row.data.sku || '—')
          : entityType === 'customers'
            ? String(row.data.email || '—')
            : String(row.data.name || '—'),
        existingId: row.existingId!,
        changes,
      };
    }).filter(Boolean) as { identifier: string; displayName: string; existingId: string; changes: { field: string; label: string; oldValue: string | number | null; newValue: string | number | null }[] }[];
  }, [parsedRows, data, entityType, config.uniqueField]);

  const handlePreviewChanges = () => {
    if (recordChanges.length > 0) {
      setShowChangesPreview(true);
    } else {
      // No actual changes, just proceed
      handleImport();
    }
  };

  const validCount = parsedRows.filter(r => r.status === 'valid').length;
  const updateCount = parsedRows.filter(r => r.status === 'update').length;
  const duplicateCount = parsedRows.filter(r => r.status === 'duplicate').length;
  const invalidCount = parsedRows.filter(r => r.status === 'invalid').length;
  const actionableCount = importMode === 'update' ? validCount + updateCount : validCount;

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
            {/* Import mode selection */}
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <p className="text-sm font-medium">Mode d'import</p>
              <RadioGroup 
                value={importMode} 
                onValueChange={(v) => handleModeChange(v as ImportMode)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="insert" id="mode-insert" />
                  <Label htmlFor="mode-insert" className="flex items-center gap-2 cursor-pointer">
                    <Plus className="w-4 h-4" />
                    <div>
                      <span className="font-medium">Insérer nouveaux</span>
                      <p className="text-xs text-muted-foreground">Ajoute uniquement les nouvelles entrées</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="update" id="mode-update" />
                  <Label htmlFor="mode-update" className="flex items-center gap-2 cursor-pointer">
                    <RefreshCw className="w-4 h-4" />
                    <div>
                      <span className="font-medium">Mettre à jour</span>
                      <p className="text-xs text-muted-foreground">Met à jour les existants + ajoute les nouveaux</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground mt-2">
                Clé de correspondance : <strong>{config.uniqueFieldLabel}</strong>
              </p>
            </div>

            {/* Supplier selector for labels */}
            {entityType === 'labels' && (
              <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Fournisseur associé (optionnel)</p>
                </div>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue placeholder="Sélectionner un fournisseur..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun fournisseur</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tous les labels importés seront associés à ce fournisseur
                </p>
              </div>
            )}

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
                <div className="flex flex-wrap gap-4 text-sm">
                  {validCount > 0 && (
                    <span className="flex items-center gap-1 text-success">
                      <Plus className="w-4 h-4" />
                      {validCount} nouveau(x)
                    </span>
                  )}
                  {updateCount > 0 && (
                    <span className="flex items-center gap-1 text-blue-500">
                      <RefreshCw className="w-4 h-4" />
                      {updateCount} mise(s) à jour
                    </span>
                  )}
                  {duplicateCount > 0 && (
                    <span className="flex items-center gap-1 text-warning">
                      <AlertTriangle className="w-4 h-4" />
                      {duplicateCount} ignoré(s)
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
                        <th className="text-center px-3 py-2">Action</th>
                        <th className="text-left px-3 py-2">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 font-mono text-xs">{getIdentifier(row)}</td>
                          <td className="px-3 py-2 truncate max-w-[200px]">{getDisplayValue(row)}</td>
                          <td className="px-3 py-2 text-center">
                            {row.status === 'valid' && <Plus className="w-4 h-4 text-success mx-auto" />}
                            {row.status === 'update' && <RefreshCw className="w-4 h-4 text-blue-500 mx-auto" />}
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Fermer
          </Button>
          {activeTab === 'import' && (
            <>
              {importMode === 'update' && updateCount > 0 && (
                <Button 
                  variant="secondary"
                  onClick={handlePreviewChanges} 
                  disabled={isImporting || updateCount === 0}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Aperçu des modifications
                </Button>
              )}
              <Button 
                onClick={handleImport} 
                disabled={isImporting || actionableCount === 0}
              >
                {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {importMode === 'update' 
                  ? `Traiter ${actionableCount} ${config.title.toLowerCase()}`
                  : `Importer ${validCount} ${config.title.toLowerCase()}`
                }
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Changes preview modal */}
      <ChangesPreviewModal
        isOpen={showChangesPreview}
        onClose={() => setShowChangesPreview(false)}
        onConfirm={() => {
          setShowChangesPreview(false);
          handleImport();
        }}
        isLoading={isImporting}
        recordChanges={recordChanges}
        entityTitle={config.title}
      />
    </Dialog>
  );
}
