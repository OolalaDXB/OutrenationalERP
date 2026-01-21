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

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UseProductsOptions {
  page?: number;
  pageSize?: number;
}

// Paginated products hook for Products page
export function usePaginatedProducts(options: UseProductsOptions = {}) {
  const { page = 1, pageSize = 50 } = options;
  
  return useQuery({
    queryKey: ['products', 'paginated', page, pageSize],
    retry: false,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
    queryFn: async (): Promise<PaginatedResult<Product>> => {
      const request = (async () => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        const { data, error, count } = await supabase
          .from('products')
          .select(`
            *,
            labels:label_id (
              country,
              website
            )
          `, { count: 'exact' })
          .is('deleted_at', null)
          .order('title')
          .range(from, to);
          
        if (error) throw error;
        
        // Map label data to flat structure for easier access
        const mappedData = (data || []).map(product => ({
          ...product,
          label_country: (product.labels as any)?.country ?? null,
          label_website: (product.labels as any)?.website ?? null,
        }));
        
        const totalCount = count || 0;
        
        return {
          data: mappedData,
          count: totalCount,
          page,
          pageSize,
          totalPages: Math.ceil(totalCount / pageSize),
        };
      })();
      return withTimeout(request, 15000, 'Timeout lors du chargement des produits.');
    }
  });
}

// Original hook for backward compatibility (returns all products as array)
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
          .is('deleted_at', null)
          .order('title');
        if (error) throw error;
        
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


interface CreateProductOptions {
  onIncompleteProduct?: (product: any, missingFields: string[]) => void;
}

export function useCreateProduct(options?: CreateProductOptions) {
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Check for missing fields and trigger notification
      const missingFields: string[] = [];
      if (!data.label_id) missingFields.push('label');
      if (!data.supplier_id) missingFields.push('fournisseur');
      if (!data.barcode) missingFields.push('code-barres');
      if (!data.sku) missingFields.push('SKU');
      
      if (missingFields.length > 0 && options?.onIncompleteProduct) {
        options.onIncompleteProduct(data, missingFields);
      }
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
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'deleted'] });
    }
  });
}

export function usePermanentDeleteProduct() {
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
      queryClient.invalidateQueries({ queryKey: ['products', 'deleted'] });
    }
  });
}

export function useDeletedProducts() {
  return useQuery({
    queryKey: ['products', 'deleted'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });
        if (error) throw error;
        return data;
      })();
      return withTimeout(request, 15000, 'Timeout lors du chargement des produits supprimés.');
    }
  });
}

export function useRestoreProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'deleted'] });
    }
  });
}
