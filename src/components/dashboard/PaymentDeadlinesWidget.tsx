import { useMemo } from "react";
import { format, differenceInDays, isPast, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Clock, CheckCircle2, CreditCard, TrendingUp } from "lucide-react";
import { useSupplierPayouts } from "@/hooks/useSupplierPayouts";
import { formatCurrency } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";

interface PaymentDeadlinesWidgetProps {
  onOpenPayoutManager?: () => void;
}

export function PaymentDeadlinesWidget({ onOpenPayoutManager }: PaymentDeadlinesWidgetProps) {
  const { data: payouts = [], isLoading } = useSupplierPayouts();

  const analysis = useMemo(() => {
    const pending = payouts.filter(p => p.status === "pending");
    const paid = payouts.filter(p => p.status === "paid");
    
    // Calculate overdue (pending payouts older than 30 days from period_end)
    const now = new Date();
    const overdue = pending.filter(p => {
      const periodEnd = new Date(p.period_end);
      return differenceInDays(now, periodEnd) > 30;
    });
    
    // Calculate upcoming (due within next 7 days)
    const upcoming = pending.filter(p => {
      const periodEnd = new Date(p.period_end);
      const dueDate = addDays(periodEnd, 30);
      const daysUntilDue = differenceInDays(dueDate, now);
      return daysUntilDue >= 0 && daysUntilDue <= 7;
    });

    const totalPending = pending.reduce((sum, p) => sum + p.payout_amount, 0);
    const totalOverdue = overdue.reduce((sum, p) => sum + p.payout_amount, 0);
    const totalUpcoming = upcoming.reduce((sum, p) => sum + p.payout_amount, 0);

    return {
      pending,
      paid,
      overdue,
      upcoming,
      totalPending,
      totalOverdue,
      totalUpcoming,
    };
  }, [payouts]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 animate-pulse">
        <div className="h-6 bg-secondary rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-secondary rounded"></div>
          <div className="h-16 bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Échéances de paiement</h3>
            <p className="text-xs text-muted-foreground">
              {analysis.pending.length} reversement(s) en attente
            </p>
          </div>
        </div>
        {onOpenPayoutManager && (
          <button
            onClick={onOpenPayoutManager}
            className="text-sm text-primary hover:underline"
          >
            Voir tout
          </button>
        )}
      </div>

      {/* Alert cards */}
      <div className="p-4 space-y-3">
        {/* Overdue alert */}
        {analysis.overdue.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-destructive">
                {analysis.overdue.length} reversement(s) en retard
              </div>
              <div className="text-sm text-destructive/80">
                {formatCurrency(analysis.totalOverdue)} à payer
              </div>
            </div>
            <StatusBadge variant="danger">Urgent</StatusBadge>
          </div>
        )}

        {/* Upcoming payments */}
        {analysis.upcoming.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <Clock className="w-5 h-5 text-warning-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-warning-foreground">
                {analysis.upcoming.length} reversement(s) à échéance proche
              </div>
              <div className="text-sm text-warning-foreground/80">
                {formatCurrency(analysis.totalUpcoming)} dû sous 7 jours
              </div>
            </div>
            <StatusBadge variant="warning">À traiter</StatusBadge>
          </div>
        )}

        {/* All good */}
        {analysis.overdue.length === 0 && analysis.upcoming.length === 0 && analysis.pending.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-success">
                Aucun reversement urgent
              </div>
              <div className="text-sm text-success/80">
                {formatCurrency(analysis.totalPending)} en attente (non urgent)
              </div>
            </div>
          </div>
        )}

        {analysis.pending.length === 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
            <CheckCircle2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="text-muted-foreground">
              Aucun reversement en attente
            </div>
          </div>
        )}
      </div>

      {/* Pending payouts list */}
      {analysis.pending.length > 0 && (
        <div className="border-t border-border">
          <div className="max-h-[200px] overflow-auto">
            {analysis.pending.slice(0, 5).map((payout: any) => {
              const periodEnd = new Date(payout.period_end);
              const dueDate = addDays(periodEnd, 30);
              const daysOverdue = differenceInDays(new Date(), dueDate);
              const isOverdue = daysOverdue > 0;

              return (
                <div 
                  key={payout.id}
                  className="flex items-center justify-between px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-secondary/30"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{payout.suppliers?.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Période: {format(new Date(payout.period_start), "d MMM", { locale: fr })} - {format(periodEnd, "d MMM yyyy", { locale: fr })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="font-semibold">{formatCurrency(payout.payout_amount)}</div>
                    <div className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {isOverdue ? `${daysOverdue}j de retard` : `Échéance: ${format(dueDate, "d MMM", { locale: fr })}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
