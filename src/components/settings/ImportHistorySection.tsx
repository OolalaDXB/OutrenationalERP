import { useState } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { History, Undo2, Loader2, FileSpreadsheet, Check, XCircle, Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useImportHistoryWithFilters, useRollbackImport, type ImportHistory } from "@/hooks/useImportHistory";

const entityLabels: Record<string, string> = {
  products: "Produits",
  customers: "Clients",
  suppliers: "Fournisseurs",
  all: "Toutes les entités",
};

type DatePreset = "all" | "today" | "week" | "month" | "custom";

const datePresets: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Tous les imports" },
  { value: "today", label: "Aujourd'hui" },
  { value: "week", label: "7 derniers jours" },
  { value: "month", label: "30 derniers jours" },
  { value: "custom", label: "Période personnalisée" },
];

export function ImportHistorySection() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [confirmRollback, setConfirmRollback] = useState<ImportHistory | null>(null);

  // Calculate date range based on preset
  const getDateRange = () => {
    const now = new Date();
    switch (datePreset) {
      case "today":
        return { from: startOfDay(now), to: endOfDay(now) };
      case "week":
        return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case "month":
        return { from: startOfDay(subDays(now, 30)), to: endOfDay(now) };
      case "custom":
        return {
          from: dateFrom ? startOfDay(new Date(dateFrom)) : undefined,
          to: dateTo ? endOfDay(new Date(dateTo)) : undefined,
        };
      default:
        return { from: undefined, to: undefined };
    }
  };

  const { from, to } = getDateRange();

  const { data: imports = [], isLoading } = useImportHistoryWithFilters({
    entityType: entityFilter === "all" ? undefined : entityFilter,
    dateFrom: from,
    dateTo: to,
  });

  const rollbackImport = useRollbackImport();

  const handleRollback = async () => {
    if (!confirmRollback) return;
    await rollbackImport.mutateAsync(confirmRollback.id);
    setConfirmRollback(null);
  };

  const activeImports = imports.filter(i => i.status !== 'rolled_back');
  const totalCreated = activeImports.reduce((sum, i) => sum + i.records_created, 0);
  const totalUpdated = activeImports.reduce((sum, i) => sum + i.records_updated, 0);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total imports</CardDescription>
            <CardTitle className="text-2xl">{imports.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Imports actifs</CardDescription>
            <CardTitle className="text-2xl text-green-600">{activeImports.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enregistrements créés</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{totalCreated}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enregistrements modifiés</CardDescription>
            <CardTitle className="text-2xl text-orange-600">{totalUpdated}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type d'entité</Label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les entités</SelectItem>
                  <SelectItem value="products">Produits</SelectItem>
                  <SelectItem value="customers">Clients</SelectItem>
                  <SelectItem value="suppliers">Fournisseurs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Période</Label>
              <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {datePresets.map((preset) => (
                    <SelectItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {datePreset === "custom" && (
              <>
                <div className="space-y-2">
                  <Label>Date début</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date fin</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Import List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historique des imports
          </CardTitle>
          <CardDescription>
            Consultez tous les imports effectués et annulez ceux que vous souhaitez supprimer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : imports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileSpreadsheet className="w-12 h-12 mb-3 opacity-50" />
              <p>Aucun historique d'import pour ces critères</p>
            </div>
          ) : (
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(importItem.created_at), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
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
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
