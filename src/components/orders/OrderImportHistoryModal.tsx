import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { History, FileSpreadsheet, Loader2, Check, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useOrderImportHistory } from '@/hooks/useOrderImportHistory';

interface OrderImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OrderImportHistoryModal({ isOpen, onClose }: OrderImportHistoryModalProps) {
  const { data: imports = [], isLoading } = useOrderImportHistory();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des imports de commandes
          </DialogTitle>
          <DialogDescription>
            Consultez l'historique de vos imports de commandes
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : imports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileSpreadsheet className="w-12 h-12 mb-3 opacity-50" />
            <p>Aucun historique d'import</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {imports.map((importItem) => (
                <div
                  key={importItem.id}
                  className="p-4 rounded-lg border bg-card border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="uppercase text-xs">
                          {importItem.import_type}
                        </Badge>
                        {importItem.source && (
                          <Badge variant="secondary">
                            {importItem.source}
                          </Badge>
                        )}
                        {importItem.errors.length > 0 ? (
                          <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {importItem.errors.length} erreur(s)
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                            <Check className="w-3 h-3 mr-1" />
                            Réussi
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium truncate">
                        {importItem.file_name || 'Import manuel'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(importItem.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                        {importItem.user_email && ` • ${importItem.user_email}`}
                      </div>
                      <div className="flex gap-4 mt-2 text-xs flex-wrap">
                        <span className="text-success">
                          +{importItem.orders_created} commande{importItem.orders_created > 1 ? 's' : ''} créée{importItem.orders_created > 1 ? 's' : ''}
                        </span>
                        {importItem.orders_updated > 0 && (
                          <span className="text-info">
                            {importItem.orders_updated} modifiée{importItem.orders_updated > 1 ? 's' : ''}
                          </span>
                        )}
                        {importItem.orders_skipped > 0 && (
                          <span className="text-muted-foreground">
                            {importItem.orders_skipped} ignorée{importItem.orders_skipped > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-primary">
                          {importItem.items_created} article{importItem.items_created > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
