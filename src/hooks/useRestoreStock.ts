import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OrderItem } from './useOrders';

// Statuses where stock was already decremented
const STOCK_DECREMENTED_STATUSES = ['confirmed', 'processing', 'shipped', 'delivered'];

export function useRestoreStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      items,
      orderId,
      orderStatus,
      reason = 'Annulation commande'
    }: {
      items: Array<{ product_id: string | null; quantity: number; title: string }>;
      orderId: string;
      orderStatus: string | null;
      reason?: string;
    }) => {
      // Only restore stock if order was in a status where stock was decremented
      if (!orderStatus || !STOCK_DECREMENTED_STATUSES.includes(orderStatus)) {
        console.log('Stock not restored - order was in pending status');
        return { restoredCount: 0 };
      }

      let restoredCount = 0;

      for (const item of items) {
        if (!item.product_id) continue;

        try {
          // Get current stock
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();

          if (productError) {
            console.warn(`Failed to get product ${item.product_id}:`, productError);
            continue;
          }

          const currentStock = product.stock ?? 0;
          const newStock = currentStock + item.quantity;

          // Create stock movement record
          const { error: movementError } = await supabase
            .from('stock_movements')
            .insert({
              product_id: item.product_id,
              order_id: orderId,
              quantity: item.quantity,
              type: 'return',
              reason,
              stock_before: currentStock,
              stock_after: newStock
            });

          if (movementError) {
            console.warn(`Failed to create stock movement for ${item.product_id}:`, movementError);
          }

          // Update product stock
          const { error: updateError } = await supabase
            .from('products')
            .update({ stock: newStock })
            .eq('id', item.product_id);

          if (updateError) {
            console.warn(`Failed to update stock for ${item.product_id}:`, updateError);
            continue;
          }

          restoredCount++;
        } catch (error) {
          console.error(`Error restoring stock for product ${item.product_id}:`, error);
        }
      }

      return { restoredCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    }
  });
}

export function useRestoreStockForItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      quantity,
      orderId,
      reason = 'Modification commande'
    }: {
      productId: string;
      quantity: number;
      orderId: string;
      reason?: string;
    }) => {
      // Get current stock
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const currentStock = product.stock ?? 0;
      const newStock = currentStock + quantity;

      // Create stock movement record
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: productId,
          order_id: orderId,
          quantity,
          type: 'adjustment',
          reason,
          stock_before: currentStock,
          stock_after: newStock
        });

      if (movementError) {
        console.warn('Failed to create stock movement:', movementError);
      }

      // Update product stock
      const { data, error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    }
  });
}
