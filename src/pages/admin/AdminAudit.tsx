import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Download, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  'tenant.created': { label: 'Tenant créé', color: 'bg-green-500' },
  'tenant.updated': { label: 'Tenant modifié', color: 'bg-blue-500' },
  'tenant.suspended': { label: 'Tenant suspendu', color: 'bg-amber-500' },
  'tenant.deleted': { label: 'Tenant supprimé', color: 'bg-red-500' },
  'tenant.plan_assigned': { label: 'Plan assigné', color: 'bg-purple-500' },
  'tenant.status_changed': { label: 'Statut changé', color: 'bg-blue-500' },
  'user.created': { label: 'Utilisateur créé', color: 'bg-green-500' },
  'user.deleted': { label: 'Utilisateur supprimé', color: 'bg-red-500' },
  'user.role_changed': { label: 'Rôle modifié', color: 'bg-blue-500' },
  'plan.created': { label: 'Plan créé', color: 'bg-green-500' },
  'plan.updated': { label: 'Plan modifié', color: 'bg-blue-500' },
  'plan.version_created': { label: 'Version plan', color: 'bg-purple-500' },
  'admin.created': { label: 'Admin créé', color: 'bg-green-500' },
  'admin.updated': { label: 'Admin modifié', color: 'bg-blue-500' },
  'admin.deleted': { label: 'Admin supprimé', color: 'bg-red-500' },
  'request.approved': { label: 'Demande approuvée', color: 'bg-green-500' },
  'request.rejected': { label: 'Demande rejetée', color: 'bg-red-500' },
};

export function AdminAudit() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['sillon-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sillon_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  // Get unique values for filters
  const actions = logs ? [...new Set(logs.map(l => l.action))] : [];
  const targetTypes = logs ? [...new Set(logs.map(l => l.target_type))] : [];

  // Filter logs
  const filteredLogs = logs?.filter(l => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (targetTypeFilter !== 'all' && l.target_type !== targetTypeFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        l.actor_email?.toLowerCase().includes(searchLower) ||
        l.target_name?.toLowerCase().includes(searchLower) ||
        l.action.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  // Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const logsToday = logs?.filter(l => new Date(l.timestamp) >= today).length || 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const logsThisWeek = logs?.filter(l => new Date(l.timestamp) >= weekAgo).length || 0;

  const uniqueActors = logs ? new Set(logs.map(l => l.actor_email)).size : 0;

  // Export CSV
  const exportCSV = () => {
    if (!filteredLogs) return;
    const headers = ['Date', 'Heure', 'Acteur', 'Action', 'Type cible', 'Cible', 'Détails'];
    const rows = filteredLogs.map(l => [
      format(new Date(l.timestamp), 'dd/MM/yyyy'),
      format(new Date(l.timestamp), 'HH:mm:ss'),
      l.actor_email,
      l.action,
      l.target_type,
      l.target_name || '-',
      l.details ? JSON.stringify(l.details) : '-',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sillon-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Historique des actions sur la plateforme</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!filteredLogs?.length}>
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aujourd'hui</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logsToday}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cette semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logsThisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acteurs uniques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueActors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-64 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par acteur, cible..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {actions.map(a => (
              <SelectItem key={a} value={a}>{ACTION_CONFIG[a]?.label || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type cible" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {targetTypes.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Date</TableHead>
                <TableHead>Acteur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Cible</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-8" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun log trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs?.map((log) => {
                  const config = ACTION_CONFIG[log.action] || { label: log.action, color: 'bg-gray-500' };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        <div>{format(new Date(log.timestamp), 'dd/MM/yyyy')}</div>
                        <div className="text-muted-foreground text-xs">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.actor_email}</div>
                        {log.actor_role && (
                          <Badge variant="outline" className="text-xs mt-1">{log.actor_role}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${config.color} text-white`}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {log.target_name || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground">{log.target_type}</div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {log.details ? (
                          <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                            {JSON.stringify(log.details)}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
