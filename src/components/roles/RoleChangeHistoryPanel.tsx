import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { History, ShieldCheck, Shield, Eye, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRoleChangeHistory, type RoleChangeRecord } from "@/hooks/useRoleChangeHistory";
import type { AppRole } from "@/hooks/useAuth";

const roleConfig: Record<AppRole, { label: string; icon: React.ElementType; color: string }> = {
  admin: { 
    label: "Admin", 
    icon: ShieldCheck, 
    color: "bg-red-500/10 text-red-500 border-red-500/20"
  },
  staff: { 
    label: "Staff", 
    icon: Shield, 
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20"
  },
  viewer: { 
    label: "Viewer", 
    icon: Eye, 
    color: "bg-gray-500/10 text-gray-500 border-gray-500/20"
  },
};

function RoleBadge({ role }: { role: AppRole | null }) {
  if (!role) {
    return <Badge variant="outline" className="text-xs">Aucun</Badge>;
  }
  const config = roleConfig[role];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`text-xs ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function HistoryItem({ record }: { record: RoleChangeRecord }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <History className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{record.user_email}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <RoleBadge role={record.old_role} />
          <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <RoleBadge role={record.new_role} />
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Par <span className="font-medium">{record.changed_by_email}</span>
          {' · '}
          {formatDistanceToNow(new Date(record.changed_at), { addSuffix: true, locale: fr })}
        </p>
        {record.reason && (
          <p className="text-xs text-muted-foreground mt-1 italic">
            "{record.reason}"
          </p>
        )}
      </div>
    </div>
  );
}

export function RoleChangeHistoryPanel() {
  const { data: history = [], isLoading, error } = useRoleChangeHistory(20);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Erreur de chargement de l'historique
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
        Aucun changement de rôle enregistré
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-0">
        {history.map((record) => (
          <HistoryItem key={record.id} record={record} />
        ))}
      </div>
    </ScrollArea>
  );
}
