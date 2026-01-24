import { Bug } from "lucide-react";

interface PODebugBannerProps {
  canCreatePO: boolean;
  cbacLoading: boolean;
  isPending: boolean;
}

/**
 * Dev-only debug banner showing state of the PO creation form.
 * Only visible in development mode.
 */
export function PODebugBanner({ canCreatePO, cbacLoading, isPending }: PODebugBannerProps) {
  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 flex items-center gap-4 text-sm">
      <Bug className="w-4 h-4 text-warning flex-shrink-0" />
      <div className="flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">canCreatePO:</span>
          <span className={canCreatePO ? "text-success font-medium" : "text-destructive font-medium"}>
            {String(canCreatePO)}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">cbacLoading:</span>
          <span className={cbacLoading ? "text-warning font-medium" : "text-success font-medium"}>
            {String(cbacLoading)}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">isPending:</span>
          <span className={isPending ? "text-warning font-medium" : "text-success font-medium"}>
            {String(isPending)}
          </span>
        </span>
      </div>
    </div>
  );
}
