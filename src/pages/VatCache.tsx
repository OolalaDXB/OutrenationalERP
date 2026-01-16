import { useState } from "react";
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Globe,
  Building2,
  Search,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/ui/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  useVatCache, 
  useVatCacheStats, 
  useDeleteVatCacheEntry,
  usePurgeExpiredCache,
  usePurgeAllCache,
  type VatCacheEntry
} from "@/hooks/useVatCache";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { fr } from "date-fns/locale";

export function VatCachePage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'invalid' | 'expired'>('all');

  const { data: cacheEntries, isLoading, refetch } = useVatCache();
  const { data: stats } = useVatCacheStats();
  const deleteEntry = useDeleteVatCacheEntry();
  const purgeExpired = usePurgeExpiredCache();
  const purgeAll = usePurgeAllCache();

  const handleDeleteEntry = async (entry: VatCacheEntry) => {
    try {
      await deleteEntry.mutateAsync(entry.id);
      toast({
        title: "Entrée supprimée",
        description: `${entry.vat_number} a été supprimé du cache`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'entrée",
        variant: "destructive",
      });
    }
  };

  const handlePurgeExpired = async () => {
    try {
      await purgeExpired.mutateAsync();
      toast({
        title: "Cache purgé",
        description: "Les entrées expirées ont été supprimées",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de purger le cache",
        variant: "destructive",
      });
    }
  };

  const handlePurgeAll = async () => {
    try {
      await purgeAll.mutateAsync();
      toast({
        title: "Cache vidé",
        description: "Toutes les entrées ont été supprimées",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de vider le cache",
        variant: "destructive",
      });
    }
  };

  // Filter entries
  const filteredEntries = (cacheEntries || []).filter(entry => {
    const matchesSearch = 
      entry.vat_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.country_code.toLowerCase().includes(searchQuery.toLowerCase());

    const isExpired = isPast(new Date(entry.expires_at));

    if (filterStatus === 'valid') return matchesSearch && entry.is_valid && !isExpired;
    if (filterStatus === 'invalid') return matchesSearch && !entry.is_valid;
    if (filterStatus === 'expired') return matchesSearch && isExpired;
    return matchesSearch;
  });

  // Get top countries
  const topCountries = stats?.byCountry 
    ? Object.entries(stats.byCountry)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="Total entrées"
          value={String(stats?.total || 0)}
          icon={Database}
          variant="primary"
        />
        <KpiCard
          label="TVA valides"
          value={String(stats?.valid || 0)}
          icon={CheckCircle2}
          variant="success"
          trend={stats?.total ? { value: `${Math.round((stats.valid / stats.total) * 100)}%`, direction: "up" } : undefined}
        />
        <KpiCard
          label="TVA invalides"
          value={String(stats?.invalid || 0)}
          icon={XCircle}
          variant="danger"
        />
        <KpiCard
          label="Expirées"
          value={String(stats?.expired || 0)}
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Country Distribution */}
      {topCountries.length > 0 && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Répartition par pays
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {topCountries.map(([country, count]) => (
                <Badge key={country} variant="secondary" className="text-sm">
                  {country}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions & Filters */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par TVA, entreprise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'valid', 'invalid', 'expired'] as const).map((status) => (
              <Button
                key={status}
                variant={filterStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all' && 'Tous'}
                {status === 'valid' && 'Valides'}
                {status === 'invalid' && 'Invalides'}
                {status === 'expired' && 'Expirés'}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>

          {stats?.expired && stats.expired > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Clock className="w-4 h-4 mr-2" />
                  Purger expirés ({stats.expired})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Purger les entrées expirées</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action supprimera {stats.expired} entrée(s) expirée(s) du cache.
                    Les prochaines validations pour ces TVA appelleront à nouveau l'API VIES.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePurgeExpired}>
                    Purger
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-4 h-4 mr-2" />
                Vider le cache
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  Vider tout le cache
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera TOUTES les {stats?.total || 0} entrées du cache.
                  Toutes les prochaines validations TVA appelleront l'API VIES.
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handlePurgeAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Vider le cache
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro TVA</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Validé le</TableHead>
                <TableHead>Expire</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {searchQuery || filterStatus !== 'all' 
                      ? "Aucune entrée trouvée" 
                      : "Le cache est vide"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => {
                  const isExpired = isPast(new Date(entry.expires_at));
                  
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono font-medium">
                        {entry.vat_number}
                      </TableCell>
                      <TableCell>
                        {entry.company_name ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{entry.company_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.country_code}</Badge>
                      </TableCell>
                      <TableCell>
                        {isExpired ? (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                            <Clock className="w-3 h-3 mr-1" />
                            Expiré
                          </Badge>
                        ) : entry.is_valid ? (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Valide
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Invalide
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(entry.validated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className={isExpired ? 'text-amber-600' : 'text-muted-foreground'}>
                          {formatDistanceToNow(new Date(entry.expires_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteEntry(entry)}
                          disabled={deleteEntry.isPending}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center">
        Les validations TVA sont mises en cache pendant 30 jours pour réduire les appels à l'API VIES européenne.
      </p>
    </div>
  );
}
