import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type StockMovement = Tables<'stock_movements'>;

/**
 * Query stock movements for a specific product
 */
export function useStockMovements(productId?: string) {
  return useQuery({
    queryKey: ['stock_movements', productId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (productId) {
        query = query.eq('product_id', productId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!productId
  });
}

/**
 * NOTE: Direct stock modifications are now FORBIDDEN.
 * Stock changes happen ONLY via order_items mutations.
 * 
 * The database triggers handle:
 * - AFTER INSERT on order_items → stock_movements(type='sale', quantity=-qty)
 * - AFTER UPDATE status to cancelled/returned → stock_movements(type='sale_reversal', quantity=+old.qty)
 * - AFTER UPDATE quantity while active → stock_movements(type='sale_adjustment', quantity=old-new)
 * 
 * If you see "Direct stock updates are forbidden" error, this is working as intended.
 * Edit order items instead of trying to modify stock directly.
 */

// Legacy exports removed - use order_items mutations instead
// useAdjustStock - REMOVED
// useBulkAdjustStock - REMOVED
// useCreateStockMovement - REMOVED (triggers create movements automatically)
