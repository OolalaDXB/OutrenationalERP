import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollText, Search, Download, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AuditLog {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_email: string;
  actor_role: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  details: Record<string, any> | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'tenant.created': { label: 'Tenant créé', color: 'bg-green-500' },
  'tenant.updated': { label: 'Tenant modifié', color: 'bg-blue-500' },
  'tenant.suspended': { label: 'Tenant suspendu', color: 'bg-amber-500' },
  'tenant.reactivated': { label: 'Tenant réactivé', color: 'bg-green-500' },
  'tenant.plan_assigned': { label: 'Plan assigné', color: 'bg-purple-500' },
  'tenant.plan_changed': { label: 'Plan changé', color: 'bg-purple-500' },
  'tenant.status_changed': { label: 'Statut changé', color: 'bg-blue-500' },
  'user.created': { label: 'User créé', color: 'bg-green-500' },
  'user.deleted': { label: 'User supprimé', color: 'bg-red-500' },
  'user.role_changed': { label: 'Rôle changé', color: 'bg-blue-500' },
  'user.password_reset': { label: 'Password reset', color: 'bg-amber-500' },
  'capability.override_added': { label: 'Override ajouté', color: 'bg-purple-500' },
  'capability.override_removed': { label: 'Override retiré', color: 'bg-amber-500' },
  'plan.version_created': { label: 'Version plan', color: 'bg-blue-500' },
  'request.approved': { label: 'Demande approuvée', color: 'bg-green-500' },
  'request.rejected': { label: 'Demande refusée', color: 'bg-red-500' },
};

export function AdminAudit() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetFilter, setTargetFilter] = useState<string>('all');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['sillon-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sillon_audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Get unique actions and targets for filters
  const actions = logs ? [...new Set(logs.map(l => l.action))] : [];
  const targets = logs ? [...new Set(logs.map(l => l.target_type))] : [];

  // Filter logs
  const filteredLogs = logs?.filter(l => {
    if (actionFilter !== 'all' && l.action !== actionFilter) return false;
    if (targetFilter !== 'all' && l.target_type !== targetFilter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return l.actor_email.toLowerCase().includes(searchLower) ||
             l.target_name?.toLowerCase().includes(searchLower) ||
             l.action.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const exportCSV = () => {
    if (!filteredLogs) return;
    
    const headers = ['Date', 'Acteur', 'Action', 'Cible', 'Détails'];
    const rows = filteredLogs.map(l => [
      format(new Date(l.timestamp), 'dd/MM/yyyy HH:mm'),
      l.actor_email,
      l.action,
      l.target_name || l.target_id || '-',
      JSON.stringify(l.details || {}),
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sillon-audit-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Historique des actions administratives</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!logs?.length}>
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {actions.map(a => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a]?.label || a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={targetFilter} onValueChange={setTargetFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {targets.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
            <div className="text-2xl font-bold">
              {logs?.filter(l => {
                const today = new Date();
                const logDate = new Date(l.timestamp);
                return logDate.toDateString() === today.toDateString();
              }).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cette semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs?.filter(l => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(l.timestamp) > weekAgo;
              }).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acteurs uniques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs ? new Set(logs.map(l => l.actor_email)).size : 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  </TableRow>
                ))
              ) : filteredLogs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucun log
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs?.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-500' };
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        <div>{format(new Date(log.timestamp), 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.actor_email}</div>
                        {log.actor_role && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {log.actor_role}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={actionInfo.color}>
                          {actionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{log.target_name || '-'}</div>
                        <div className="text-xs text-muted-foreground">
                          {log.target_type}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {JSON.stringify(log.details).slice(0, 50)}...
                          </code>
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
