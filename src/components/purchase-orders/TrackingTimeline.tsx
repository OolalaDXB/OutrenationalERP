import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { MapPin, Clock, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackingStatusConfig } from "@/hooks/useShip24Tracking";
import { cn } from "@/lib/utils";

interface TrackingEvent {
  status: string;
  statusCode?: string;
  location?: string;
  message?: string;
  occurredAt: string;
}

interface TrackingTimelineProps {
  events: TrackingEvent[];
  currentStatus?: string;
  lastUpdate?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TrackingTimeline({
  events,
  currentStatus,
  lastUpdate,
  onRefresh,
  isRefreshing,
}: TrackingTimelineProps) {
  const statusConfig = trackingStatusConfig[currentStatus || 'unknown'] || trackingStatusConfig.unknown;

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucun événement de suivi disponible</p>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="mt-3"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Actualiser
          </Button>
        )}
      </div>
    );
  }

  // Sort events by date (most recent first)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  );

  return (
    <div className="space-y-4">
      {/* Current Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("px-2 py-1 rounded-full text-xs font-medium", statusConfig.color)}>
            {statusConfig.label}
          </span>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Mis à jour {formatDistanceToNow(new Date(lastUpdate), { addSuffix: true, locale: fr })}
            </span>
          )}
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

        <div className="space-y-4">
          {sortedEvents.map((event, index) => (
            <div key={`${event.occurredAt}-${index}`} className="relative pl-7">
              {/* Dot */}
              <div
                className={cn(
                  "absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-background",
                  index === 0 ? "bg-primary" : "bg-muted-foreground/50"
                )}
              />

              <div className="space-y-0.5">
                <p className={cn("text-sm font-medium", index === 0 ? "text-foreground" : "text-muted-foreground")}>
                  {event.message || event.status}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {format(new Date(event.occurredAt), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
