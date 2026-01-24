import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreateTrackerParams {
  trackingNumber: string;
  courierCode?: string;
  purchaseOrderId: string;
}

interface TrackingEvent {
  status: string;
  statusCode?: string;
  location?: string;
  message?: string;
  occurredAt: string;
}

interface TrackingStatus {
  status: string;
  statusMilestone?: string;
  events: TrackingEvent[];
}

export function useCreateShip24Tracker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTrackerParams): Promise<{ trackerId: string }> => {
      const { data, error } = await supabase.functions.invoke('ship24-tracking/create-tracker', {
        body: params,
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Failed to create tracker');

      return { trackerId: data.trackerId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.purchaseOrderId] });
    },
  });
}

export function useRefreshTracking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ trackerId, purchaseOrderId }: { trackerId: string; purchaseOrderId: string }): Promise<TrackingStatus> => {
      const { data, error } = await supabase.functions.invoke('ship24-tracking/get-status', {
        body: { trackerId },
      });

      if (error) throw new Error(error.message);

      // Update the PO with the new status
      if (data?.status) {
        await supabase
          .from('purchase_orders')
          .update({
            tracking_status: data.status,
            tracking_events: data.events,
            tracking_last_update: new Date().toISOString(),
          })
          .eq('id', purchaseOrderId);
      }

      return data as TrackingStatus;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.purchaseOrderId] });
    },
  });
}

// Status display configuration
export const trackingStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-muted text-muted-foreground' },
  in_transit: { label: 'En transit', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  out_for_delivery: { label: 'En livraison', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  delivered: { label: 'Livré', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  exception: { label: 'Exception', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  unknown: { label: 'Inconnu', color: 'bg-muted text-muted-foreground' },
};
