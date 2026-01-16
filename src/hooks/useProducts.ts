import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { withTimeout } from '@/lib/withTimeout';

export type Product = Tables<'products'> & {
  label_country?: string | null;
  label_website?: string | null;
};
export type ProductInsert = TablesInsert<'products'>;
export type ProductUpdate = TablesUpdate<'products'>;

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            labels:label_id (
              country,
              website
            )
          `)
          .order('title');
        if (error) throw error;
        
        // Map label data to flat structure for easier access
        return data.map(product => ({
          ...product,
          label_country: (product.labels as any)?.country ?? null,
          label_website: (product.labels as any)?.website ?? null,
        }));
      })();
      return withTimeout(request, 15000, 'Timeout lors du chargement des produits.');
    }
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      })();
      return withTimeout(request, 15000, 'Timeout lors du chargement du produit.');
    },
    enabled: !!id
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('v_low_stock_products')
          .select('*')
          .order('stock');
        if (error) throw error;
        return data;
      })();
      return withTimeout(request, 15000, 'Timeout lors du chargement des alertes stock.');
    }
  });
}


export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: ProductInsert) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ProductUpdate) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', variables.id] });
    }
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
}
