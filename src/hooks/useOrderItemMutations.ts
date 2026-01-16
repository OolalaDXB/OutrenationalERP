import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesUpdate } from '@/integrations/supabase/types';

export type OrderItemUpdate = TablesUpdate<'order_items'>;

/**
 * Calculate total_price with 2 decimal precision
 */
export function calculateTotalPrice(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Create a new order item
 * Triggers will handle stock decrement automatically
 */
export function useCreateOrderItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      orderId,
      title,
      quantity,
      unitPrice,
      productId,
      sku,
      supplierId,
      supplierName,
      supplierType,
      unitCost,
      artistName,
      format,
      imageUrl,
      consignmentRate
    }: {
      orderId: string;
      title: string;
      quantity: number;
      unitPrice: number;
      productId?: string | null;
      sku?: string | null;
      supplierId?: string | null;
      supplierName?: string | null;
      supplierType?: 'consignment' | 'purchase' | 'own' | 'depot_vente' | null;
      unitCost?: number | null;
      artistName?: string | null;
      format?: 'lp' | '2lp' | '3lp' | 'cd' | 'boxset' | '7inch' | '10inch' | '12inch' | 'cassette' | 'digital' | null;
      imageUrl?: string | null;
      consignmentRate?: number | null;
    }) => {
      // Validate quantity
      if (quantity <= 0) {
        throw new Error('La quantité doit être supérieure à 0');
      }

      const totalPrice = calculateTotalPrice(quantity, unitPrice);

      const { data, error } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          title,
          quantity,
          unit_price: unitPrice,
          total_price: totalPrice,
          product_id: productId ?? null,
          sku: sku ?? null,
          supplier_id: supplierId ?? null,
          supplier_name: supplierName ?? null,
          supplier_type: supplierType ?? null,
          unit_cost: unitCost ?? null,
          artist_name: artistName ?? null,
          format: format ?? null,
          image_url: imageUrl ?? null,
          consignment_rate: consignmentRate ?? null,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'with-items'] });
      queryClient.invalidateQueries({ queryKey: ['order_items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    }
  });
}

/**
 * Cancel an order item (staff/admin only)
 * Triggers will handle stock restoration via sale_reversal
 */
export function useCancelOrderItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      itemId,
      orderId
    }: {
      itemId: string;
      orderId: string;
    }) => {
      const { data, error } = await supabase
        .from('order_items')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('status', 'active') // Only cancel active items
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'with-items'] });
      queryClient.invalidateQueries({ queryKey: ['order_items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    }
  });
}

/**
 * Return an order item (staff/admin only)
 * Triggers will handle stock restoration via sale_reversal
 */
export function useReturnOrderItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      itemId,
      orderId,
      returnReason
    }: {
      itemId: string;
      orderId: string;
      returnReason: string;
    }) => {
      if (!returnReason.trim()) {
        throw new Error('La raison du retour est obligatoire');
      }

      const { data, error } = await supabase
        .from('order_items')
        .update({
          status: 'returned',
          returned_at: new Date().toISOString(),
          return_reason: returnReason.trim()
        })
        .eq('id', itemId)
        .eq('status', 'active') // Only return active items
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'with-items'] });
      queryClient.invalidateQueries({ queryKey: ['order_items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    }
  });
}

/**
 * Update order item quantity (staff/admin only)
 * Only works for active items
 * Triggers will handle stock adjustment via sale_adjustment
 */
export function useUpdateOrderItemQuantity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      itemId,
      orderId,
      newQuantity,
      unitPrice
    }: {
      itemId: string;
      orderId: string;
      newQuantity: number;
      unitPrice: number;
    }) => {
      // Validate quantity
      if (newQuantity <= 0) {
        throw new Error('La quantité doit être supérieure à 0');
      }

      const totalPrice = calculateTotalPrice(newQuantity, unitPrice);

      const { data, error } = await supabase
        .from('order_items')
        .update({
          quantity: newQuantity,
          total_price: totalPrice
        })
        .eq('id', itemId)
        .eq('status', 'active') // Only update active items
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'with-items'] });
      queryClient.invalidateQueries({ queryKey: ['order_items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    }
  });
}

/**
 * Delete an order item completely (removes from database)
 * Use with caution - prefer cancel/return for tracking
 */
export function useDeleteOrderItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      itemId,
      orderId
    }: {
      itemId: string;
      orderId: string;
    }) => {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'with-items'] });
      queryClient.invalidateQueries({ queryKey: ['order_items', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    }
  });
}
