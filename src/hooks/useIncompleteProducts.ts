import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';

export interface IncompleteProduct {
  id: string;
  sku: string;
  title: string;
  artist_name: string | null;
  label_id: string | null;
  label_name: string | null;
  supplier_id: string;
  supplier_name: string | null;
  barcode: string | null;
  image_url: string | null;
  stock: number | null;
  missing_fields: string[];
}

export function useIncompleteProducts() {
  return useQuery({
    queryKey: ['products', 'incomplete'],
    retry: false,
    queryFn: async (): Promise<IncompleteProduct[]> => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('products')
          .select('id, sku, title, artist_name, label_id, label_name, supplier_id, supplier_name, barcode, image_url, stock')
          .or('label_id.is.null,supplier_id.is.null,barcode.is.null,sku.is.null')
          .order('title');
        
        if (error) throw error;
        
        // Determine which fields are missing for each product
        return (data || []).map(product => {
          const missing_fields: string[] = [];
          
          if (!product.label_id) missing_fields.push('label');
          if (!product.supplier_id) missing_fields.push('supplier');
          if (!product.barcode) missing_fields.push('barcode');
          if (!product.sku) missing_fields.push('sku');
          
          return {
            ...product,
            missing_fields,
          };
        }).filter(p => p.missing_fields.length > 0);
      })();
      
      return withTimeout(request, 15000, 'Timeout lors du chargement des produits incomplets.');
    }
  });
}

export function useIncompleteProductsStats() {
  return useQuery({
    queryKey: ['products', 'incomplete', 'stats'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        // Get counts for each type of missing data
        const [missingLabel, missingSupplier, missingBarcode, missingSku] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }).is('label_id', null),
          supabase.from('products').select('id', { count: 'exact', head: true }).is('supplier_id', null),
          supabase.from('products').select('id', { count: 'exact', head: true }).is('barcode', null),
          supabase.from('products').select('id', { count: 'exact', head: true }).or('sku.is.null,sku.eq.'),
        ]);
        
        return {
          missingLabel: missingLabel.count || 0,
          missingSupplier: missingSupplier.count || 0,
          missingBarcode: missingBarcode.count || 0,
          missingSku: missingSku.count || 0,
        };
      })();
      
      return withTimeout(request, 15000, 'Timeout lors du chargement des stats.');
    }
  });
}
