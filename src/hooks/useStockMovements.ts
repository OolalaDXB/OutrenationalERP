import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type StockMovement = Tables<'stock_movements'>;
export type StockMovementInsert = TablesInsert<'stock_movements'>;

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

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (movement: StockMovementInsert) => {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert(movement)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      productId, 
      quantity, 
      type, 
      reason 
    }: { 
      productId: string; 
      quantity: number; 
      type: StockMovement['type']; 
      reason?: string;
    }) => {
      // First get current stock
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
          quantity: Math.abs(quantity),
          type,
          reason: reason || null,
          stock_before: currentStock,
          stock_after: newStock
        });
      
      if (movementError) throw movementError;
      
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements', variables.productId] });
    }
  });
}
