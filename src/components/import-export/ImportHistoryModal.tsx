import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { History, Undo2, Loader2, FileSpreadsheet, Check, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useImportHistory, useRollbackImport, type ImportHistory } from "@/hooks/useImportHistory";

const entityLabels: Record<string, string> = {
  products: "Produits",
  customers: "Clients",
  suppliers: "Fournisseurs",
};

interface ImportHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: string;
}

export function ImportHistoryModal({ isOpen, onClose, entityType }: ImportHistoryModalProps) {
  const { data: imports = [], isLoading } = useImportHistory(entityType);
  const rollbackImport = useRollbackImport();
  const [confirmRollback, setConfirmRollback] = useState<ImportHistory | null>(null);

  const handleRollback = async () => {
    if (!confirmRollback) return;
    await rollbackImport.mutateAsync(confirmRollback.id);
    setConfirmRollback(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historique des imports
              {entityType && <Badge variant="secondary">{entityLabels[entityType]}</Badge>}
            </DialogTitle>
            <DialogDescription>
              Consultez l'historique des imports et annulez ceux que vous souhaitez supprimer.
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
                    className={`p-4 rounded-lg border ${
                      importItem.status === 'rolled_back' 
                        ? 'bg-muted/50 border-muted' 
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">
                            {entityLabels[importItem.entity_type] || importItem.entity_type}
                          </Badge>
                          {importItem.status === 'rolled_back' ? (
                            <Badge variant="secondary" className="bg-orange-500/20 text-orange-600 border-orange-500/30">
                              <XCircle className="w-3 h-3 mr-1" />
                              Annulé
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-green-500/30">
                              <Check className="w-3 h-3 mr-1" />
                              Actif
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm font-medium truncate">
                          {importItem.file_name || "Import manuel"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {format(new Date(importItem.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                          {importItem.user_email && ` • ${importItem.user_email}`}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs">
                          <span className="text-green-600">
                            +{importItem.records_created} créé{importItem.records_created > 1 ? 's' : ''}
                          </span>
                          {importItem.records_updated > 0 && (
                            <span className="text-blue-600">
                              {importItem.records_updated} modifié{importItem.records_updated > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {importItem.rolled_back_at && (
                          <div className="text-xs text-orange-600 mt-1">
                            Annulé le {format(new Date(importItem.rolled_back_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                          </div>
                        )}
                      </div>
                      {importItem.status !== 'rolled_back' && importItem.records_created > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setConfirmRollback(importItem)}
                          disabled={rollbackImport.isPending}
                          className="shrink-0"
                        >
                          <Undo2 className="w-4 h-4 mr-1" />
                          Annuler
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRollback} onOpenChange={() => setConfirmRollback(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler cet import ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va supprimer définitivement les {confirmRollback?.records_created} enregistrement(s) 
              créé(s) lors de cet import. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRollback}
              disabled={rollbackImport.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {rollbackImport.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Confirmer la suppression"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
