/**
 * DEPRECATED: Stock restoration is now handled automatically by database triggers.
 * 
 * When order_items.status changes from 'active' to 'cancelled' or 'returned',
 * the trigger automatically creates a sale_reversal stock movement.
 * 
 * DO NOT use these hooks for new code. They are kept only for backwards compatibility
 * and will log warnings when used.
 */

import { useQueryClient } from '@tanstack/react-query';

/**
 * @deprecated Use useCancelOrderItem or useReturnOrderItem from useOrderItemMutations instead.
 * Stock is now restored automatically via database triggers.
 */
export function useRestoreStock() {
  const queryClient = useQueryClient();

  return {
    mutateAsync: async ({
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
      console.warn(
        'useRestoreStock is DEPRECATED. Stock restoration is now handled by database triggers. ' +
        'Use useCancelOrderItem or useReturnOrderItem to change item status instead.'
      );
      
      // Just invalidate queries - triggers handle stock
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      
      return { restoredCount: items.length };
    },
    isPending: false
  };
}

/**
 * @deprecated Use useUpdateOrderItemQuantity from useOrderItemMutations instead.
 * Stock adjustments are now handled automatically via database triggers.
 */
export function useRestoreStockForItem() {
  const queryClient = useQueryClient();

  return {
    mutateAsync: async ({
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
      console.warn(
        'useRestoreStockForItem is DEPRECATED. Stock adjustments are now handled by database triggers. ' +
        'Use useUpdateOrderItemQuantity to change quantity instead.'
      );
      
      // Just invalidate queries - triggers handle stock
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      
      return { success: true };
    },
    isPending: false
  };
}
