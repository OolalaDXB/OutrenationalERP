import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrderImportHistory {
  id: string;
  created_at: string;
  file_name: string | null;
  import_type: string;
  source: string | null;
  orders_created: number;
  orders_updated: number;
  orders_skipped: number;
  items_created: number;
  errors: string[];
  user_id: string | null;
  user_email: string | null;
}

export interface CreateOrderImportHistoryInput {
  file_name?: string;
  import_type: 'csv' | 'xls' | 'ocr';
  source?: string;
  orders_created: number;
  orders_updated: number;
  orders_skipped: number;
  items_created: number;
  errors: string[];
}

export function useOrderImportHistory() {
  return useQuery({
    queryKey: ['order-import-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_import_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as OrderImportHistory[];
    },
  });
}

export function useCreateOrderImportHistory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: CreateOrderImportHistoryInput) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('order_import_history')
        .insert({
          file_name: input.file_name || null,
          import_type: input.import_type,
          source: input.source || null,
          orders_created: input.orders_created,
          orders_updated: input.orders_updated,
          orders_skipped: input.orders_skipped,
          items_created: input.items_created,
          errors: input.errors,
          user_id: user?.id || null,
          user_email: user?.email || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-import-history'] });
    },
  });
}
