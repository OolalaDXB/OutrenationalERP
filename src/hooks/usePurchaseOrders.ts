import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate, Database } from '@/integrations/supabase/types';
import { withTimeout } from '@/lib/withTimeout';

export type POStatus = Database['public']['Enums']['po_status'];
export type PurchaseOrder = Tables<'purchase_orders'>;
export type PurchaseOrderItem = Tables<'purchase_order_items'>;
export type PurchaseOrderInsert = TablesInsert<'purchase_orders'>;
export type PurchaseOrderUpdate = TablesUpdate<'purchase_orders'>;

export interface PurchaseOrderWithItems extends PurchaseOrder {
  purchase_order_items: PurchaseOrderItem[];
  suppliers?: Tables<'suppliers'> | null;
}

// Status configuration for UI
export const poStatusConfig: Record<POStatus, { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  draft: { label: 'Brouillon', variant: 'primary' },
  sent: { label: 'Envoyée', variant: 'info' },
  acknowledged: { label: 'Confirmée', variant: 'warning' },
  in_transit: { label: 'En transit', variant: 'info' },
  partially_received: { label: 'Réception partielle', variant: 'warning' },
  received: { label: 'Réceptionnée', variant: 'success' },
  closed: { label: 'Clôturée', variant: 'success' },
  cancelled: { label: 'Annulée', variant: 'danger' },
};

// Carrier labels for display
export const carrierLabels: Record<string, string> = {
  dhl: 'DHL',
  fedex: 'FedEx',
  ups: 'UPS',
  colissimo: 'Colissimo',
  la_poste: 'La Poste',
  chronopost: 'Chronopost',
  other: 'Autre',
};

// Payment method labels for display
export const paymentMethodLabels: Record<string, string> = {
  bank_transfer: 'Virement bancaire',
  card: 'Carte bancaire',
  paypal: 'PayPal',
  check: 'Chèque',
  cash: 'Espèces',
  other: 'Autre',
};

// Allowed transitions for UI button display
// Note: 'in_transit' transition is handled via tracking modal, not direct button
export const poAllowedTransitions: Record<POStatus, { to: POStatus; label: string; variant?: 'default' | 'destructive' | 'outline' }[]> = {
  draft: [
    { to: 'sent', label: 'Envoyer', variant: 'default' },
    { to: 'cancelled', label: 'Annuler', variant: 'destructive' },
  ],
  sent: [
    { to: 'acknowledged', label: 'Fournisseur a confirmé', variant: 'default' },
    { to: 'cancelled', label: 'Annuler', variant: 'destructive' },
  ],
  acknowledged: [
    // in_transit handled via tracking modal
    { to: 'cancelled', label: 'Annuler', variant: 'destructive' },
  ],
  in_transit: [
    // received handled in Sprint 5-B (goods reception)
  ],
  partially_received: [
    { to: 'cancelled', label: 'Annuler', variant: 'destructive' },
  ],
  received: [
    { to: 'closed', label: 'Clôturer', variant: 'default' },
  ],
  closed: [],
  cancelled: [],
};

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            purchase_order_items(*),
            suppliers(id, name, email, phone, address, city, postal_code, country)
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as PurchaseOrderWithItems[];
      })();
      return withTimeout(request, 15000, 'Timeout lors du chargement des commandes fournisseurs.');
    }
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    retry: false,
    enabled: !!id,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('purchase_orders')
          .select(`
            *,
            purchase_order_items(*),
            suppliers(id, name, email, phone, address, city, postal_code, country, vat_number)
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        return data as PurchaseOrderWithItems;
      })();
      return withTimeout(request, 15000, 'Timeout lors du chargement de la commande fournisseur.');
    }
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      supplier_id: string;
      items: { product_id?: string; sku?: string; title: string; quantity_ordered: number; unit_cost: number }[];
      notes?: string;
      expected_date?: string;
      shipping_cost?: number;
      currency?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_purchase_order', {
        p_supplier_id: params.supplier_id,
        p_items: params.items,
        p_notes: params.notes || null,
        p_expected_delivery_date: params.expected_date || null,
      });
      
      if (error) throw error;
      
      // If shipping cost or currency needs to be set, update the PO
      if (params.shipping_cost || params.currency) {
        const updates: PurchaseOrderUpdate = {};
        if (params.shipping_cost) updates.shipping_cost = params.shipping_cost;
        if (params.currency) updates.currency = params.currency;
        
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update(updates)
          .eq('id', data);
        
        if (updateError) console.warn('Failed to update PO shipping/currency:', updateError);
      }
      
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    }
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & PurchaseOrderUpdate) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.id] });
    }
  });
}

export function useChangePOStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: POStatus; reason?: string }) => {
      const { data, error } = await supabase.rpc('po_change_status', {
        _po_id: id,
        _to: status,
        _reason: reason || null,
      });
      
      if (error) throw error;
      return data as POStatus;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', variables.id] });
    }
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    }
  });
}
