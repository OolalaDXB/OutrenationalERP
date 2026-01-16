import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FieldChange {
  field: string;
  label: string;
  oldValue: string | number | null;
  newValue: string | number | null;
}

interface RecordChanges {
  identifier: string;
  displayName: string;
  existingId: string;
  changes: FieldChange[];
}

interface ChangesPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
  recordChanges: RecordChanges[];
  entityTitle: string;
}

export function ChangesPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  recordChanges,
  entityTitle,
}: ChangesPreviewModalProps) {
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());

  const toggleRecord = (id: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecords(newExpanded);
  };

  const expandAll = () => {
    setExpandedRecords(new Set(recordChanges.map(r => r.existingId)));
  };

  const collapseAll = () => {
    setExpandedRecords(new Set());
  };

  const totalChanges = recordChanges.reduce((acc, r) => acc + r.changes.length, 0);

  const formatValue = (val: string | number | null): string => {
    if (val === null || val === undefined || val === '') return '—';
    return String(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Aperçu des modifications
          </DialogTitle>
          <DialogDescription>
            {recordChanges.length} {entityTitle.toLowerCase()} seront mis à jour ({totalChanges} champs modifiés)
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Tout déplier
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Tout replier
            </Button>
          </div>
          <Badge variant="outline" className="text-xs">
            {recordChanges.length} enregistrement(s)
          </Badge>
        </div>

        <ScrollArea className="flex-1 min-h-0 border border-border rounded-lg">
          <div className="divide-y divide-border">
            {recordChanges.map((record) => {
              const isExpanded = expandedRecords.has(record.existingId);
              return (
                <div key={record.existingId} className="bg-card">
                  {/* Record header */}
                  <button
                    onClick={() => toggleRecord(record.existingId)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{record.displayName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{record.identifier}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {record.changes.length} modification(s)
                    </Badge>
                  </button>

                  {/* Expanded changes */}
                  {isExpanded && (
                    <div className="px-3 pb-3">
                      <div className="bg-secondary/30 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-1/4">Champ</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-[35%]">Valeur actuelle</th>
                              <th className="text-center px-1 py-2 w-6"></th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground w-[35%]">Nouvelle valeur</th>
                            </tr>
                          </thead>
                          <tbody>
                            {record.changes.map((change, idx) => (
                              <tr key={change.field} className={cn(idx > 0 && "border-t border-border/50")}>
                                <td className="px-3 py-2 font-medium text-xs">{change.label}</td>
                                <td className="px-3 py-2">
                                  <span className="text-xs text-red-500 line-through bg-red-500/10 px-1.5 py-0.5 rounded">
                                    {formatValue(change.oldValue)}
                                  </span>
                                </td>
                                <td className="text-center px-1 py-2">
                                  <ArrowRight className="w-3 h-3 text-muted-foreground mx-auto" />
                                </td>
                                <td className="px-3 py-2">
                                  <span className="text-xs text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">
                                    {formatValue(change.newValue)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Confirmer {recordChanges.length} mise(s) à jour
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper to get field labels for each entity type
export const fieldLabels: Record<string, Record<string, string>> = {
  products: {
    sku: 'SKU',
    title: 'Titre',
    artist_name: 'Artiste',
    format: 'Format',
    selling_price: 'Prix de vente',
    cost_price: 'Prix d\'achat',
    stock: 'Stock',
    stock_threshold: 'Seuil de stock',
    location: 'Emplacement',
    barcode: 'Code-barres',
    catalog_number: 'N° catalogue',
    label_name: 'Label',
    year_released: 'Année',
    country_of_origin: 'Pays',
    condition_media: 'État disque',
    condition_sleeve: 'État pochette',
  },
  customers: {
    email: 'Email',
    first_name: 'Prénom',
    last_name: 'Nom',
    company_name: 'Société',
    customer_type: 'Type',
    phone: 'Téléphone',
    address: 'Adresse',
    address_line_2: 'Adresse (suite)',
    city: 'Ville',
    postal_code: 'Code postal',
    country: 'Pays',
    vat_number: 'N° TVA',
    discount_rate: 'Remise (%)',
    payment_terms: 'Délai paiement',
    notes: 'Notes',
  },
  suppliers: {
    name: 'Nom',
    type: 'Type',
    email: 'Email',
    phone: 'Téléphone',
    contact_name: 'Contact',
    address: 'Adresse',
    city: 'Ville',
    postal_code: 'Code postal',
    country: 'Pays',
    commission_rate: 'Commission (%)',
    payment_terms: 'Délai paiement',
    vat_number: 'N° TVA',
    iban: 'IBAN',
    bic: 'BIC',
    website: 'Site web',
    notes: 'Notes',
  },
};
