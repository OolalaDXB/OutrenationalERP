import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for Pro customers to cancel their own pending orders
 * This will trigger stock restoration via database triggers
 */
export function useCancelProOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, customerId }: { orderId: string; customerId: string }) => {
      // First, verify the order belongs to this customer and is still pending
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, customer_id')
        .eq('id', orderId)
        .eq('customer_id', customerId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (!order) {
        throw new Error('Commande introuvable');
      }
      
      if (order.status !== 'pending') {
        throw new Error('Seules les commandes en attente peuvent être annulées');
      }
      
      // Cancel all active order items first (this triggers stock restoration)
      const { error: itemsError } = await supabase
        .from('order_items')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('status', 'active');
      
      if (itemsError) throw itemsError;
      
      // Then cancel the order itself
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Annulée par le client Pro'
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pro_orders_full', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
}

/**
 * Hook for Pro customers to request a refund for delivered orders
 * This only flags the order for staff review - does NOT change status
 */
export function useRequestRefund() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      orderId, 
      customerId, 
      reason 
    }: { 
      orderId: string; 
      customerId: string; 
      reason: string;
    }) => {
      // Verify the order belongs to this customer and is delivered
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('id, status, delivered_at, customer_id')
        .eq('id', orderId)
        .eq('customer_id', customerId)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (!order) {
        throw new Error('Commande introuvable');
      }
      
      if (order.status !== 'delivered') {
        throw new Error('Seules les commandes livrées peuvent faire l\'objet d\'une demande de remboursement');
      }
      
      // Check if within 14 days of delivery
      if (order.delivered_at) {
        const deliveredDate = new Date(order.delivered_at);
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        
        if (deliveredDate < fourteenDaysAgo) {
          throw new Error('Le délai de 14 jours pour demander un remboursement est dépassé');
        }
      }
      
      // Flag the order for refund review
      // Cast to any to handle new columns not yet in generated types
      const { data, error } = await supabase
        .from('orders')
        .update({
          refund_requested: true,
          refund_requested_at: new Date().toISOString(),
          refund_reason: reason
        } as any)
        .eq('id', orderId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pro_orders_full', variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
}
