import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export type OrderInsert = TablesInsert<'orders'>;
export type OrderItemInsert = TablesInsert<'order_items'>;
export type OrderUpdate = TablesUpdate<'orders'>;

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
}

export function useOrdersWithItems() {
  return useQuery({
    queryKey: ['orders', 'with-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
}

export function useOrderItems(orderId: string) {
  return useQuery({
    queryKey: ['order_items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      if (error) throw error;
      return data;
    },
    enabled: !!orderId
  });
}

export function useAllOrderItems() {
  return useQuery({
    queryKey: ['order_items', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          orders!inner (created_at, status)
        `)
        .not('orders.status', 'in', '("cancelled","refunded")');
      if (error) throw error;
      return data.map(item => ({
        ...item,
        created_at: item.orders?.created_at
      }));
    }
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ order, items }: { order: OrderInsert; items: Omit<OrderItemInsert, 'order_id'>[] }) => {
      console.log('Creating order with data:', { order, items });
      
      // Insert order first
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();
      if (orderError) {
        console.error('Order creation error:', orderError);
        throw orderError;
      }
      console.log('Order created:', orderData);

      // Insert order items with the new order_id
      if (items.length > 0) {
        const itemsWithOrderId = items.map(item => ({
          ...item,
          order_id: orderData.id
        }));
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);
        if (itemsError) {
          console.error('Order items error:', itemsError);
          throw itemsError;
        }
        console.log('Order items created');

        // Decrement stock for each product
        for (const item of items) {
          if (item.product_id) {
            // Get current stock
            const { data: product } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.product_id)
              .single();
            
            if (product) {
              const newStock = Math.max(0, (product.stock || 0) - item.quantity);
              const { error: stockError } = await supabase
                .from('products')
                .update({ stock: newStock })
                .eq('id', item.product_id);
              if (stockError) {
                console.warn('Stock decrement warning:', stockError);
              }
            }
          }
        }
      }

      return orderData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Order['status'] }) => {
      const updateData: OrderUpdate = { status };
      
      // Add timestamp based on status
      if (status === 'shipped') {
        updateData.shipped_at = new Date().toISOString();
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
    }
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled' as const,
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason || null
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
    }
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & OrderUpdate) => {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.id] });
    }
  });
}

export type OrderItemUpdate = {
  id: string;
  product_id?: string | null;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type OrderItemCreate = {
  order_id: string;
  product_id?: string | null;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export function useUpdateOrderItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ 
      orderId, 
      itemsToDelete, 
      itemsToUpdate, 
      itemsToCreate 
    }: { 
      orderId: string;
      itemsToDelete: string[];
      itemsToUpdate: OrderItemUpdate[];
      itemsToCreate: OrderItemCreate[];
    }) => {
      // Delete items
      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('order_items')
          .delete()
          .in('id', itemsToDelete);
        if (deleteError) throw deleteError;
      }

      // Update existing items
      for (const item of itemsToUpdate) {
        const { id, ...updates } = item;
        const { error: updateError } = await supabase
          .from('order_items')
          .update(updates)
          .eq('id', id);
        if (updateError) throw updateError;
      }

      // Create new items
      if (itemsToCreate.length > 0) {
        const { error: createError } = await supabase
          .from('order_items')
          .insert(itemsToCreate);
        if (createError) throw createError;
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['order_items', variables.orderId] });
    }
  });
}
