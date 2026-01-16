import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, Database } from '@/integrations/supabase/types';

type StockMovementType = Database['public']['Enums']['stock_movement_type'];

export type StockMovementWithProduct = Tables<'stock_movements'> & {
  products: {
    title: string;
    sku: string;
    artist_name: string | null;
    image_url: string | null;
  } | null;
  suppliers: {
    name: string;
  } | null;
};

interface UseAllStockMovementsOptions {
  type?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  limit?: number;
}

export function useAllStockMovements(options: UseAllStockMovementsOptions = {}) {
  const { type, supplierId, startDate, endDate, search, limit = 100 } = options;

  return useQuery({
    queryKey: ['all_stock_movements', type, supplierId, startDate, endDate, search, limit],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          products (title, sku, artist_name, image_url),
          suppliers (name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type && type !== 'all') {
        query = query.eq('type', type as StockMovementType);
      }

      if (supplierId && supplierId !== 'all') {
        query = query.eq('supplier_id', supplierId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by search term on the client side
      if (search) {
        const searchLower = search.toLowerCase();
        return (data as StockMovementWithProduct[]).filter(m => 
          m.products?.title?.toLowerCase().includes(searchLower) ||
          m.products?.sku?.toLowerCase().includes(searchLower) ||
          m.products?.artist_name?.toLowerCase().includes(searchLower) ||
          m.reference?.toLowerCase().includes(searchLower) ||
          m.reason?.toLowerCase().includes(searchLower)
        );
      }

      return data as StockMovementWithProduct[];
    }
  });
}
