import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SupplierLabel {
  id: string;
  supplier_id: string;
  label_id: string;
  created_at: string;
}

export function useSupplierLabels(supplierId: string | null) {
  return useQuery({
    queryKey: ['supplier_labels', supplierId],
    queryFn: async () => {
      if (!supplierId) return [];
      const { data, error } = await supabase
        .from('supplier_labels')
        .select('*')
        .eq('supplier_id', supplierId);
      
      if (error) throw error;
      return data as SupplierLabel[];
    },
    enabled: !!supplierId,
  });
}

export function useSuppliersByLabel(labelId: string | null) {
  return useQuery({
    queryKey: ['supplier_labels', 'by_label', labelId],
    queryFn: async () => {
      if (!labelId) return [];
      const { data, error } = await supabase
        .from('supplier_labels')
        .select(`
          *,
          suppliers:supplier_id (
            id,
            name
          )
        `)
        .eq('label_id', labelId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!labelId,
  });
}

export function useAllSupplierLabels() {
  return useQuery({
    queryKey: ['supplier_labels', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_labels')
        .select('*');
      
      if (error) throw error;
      return data as SupplierLabel[];
    },
  });
}

export function useSaveSupplierLabels() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ supplierId, labelIds }: { supplierId: string; labelIds: string[] }) => {
      // First, delete all existing associations for this supplier
      const { error: deleteError } = await supabase
        .from('supplier_labels')
        .delete()
        .eq('supplier_id', supplierId);
      
      if (deleteError) throw deleteError;
      
      // Then insert new associations
      if (labelIds.length > 0) {
        const inserts = labelIds.map(labelId => ({
          supplier_id: supplierId,
          label_id: labelId,
        }));
        
        const { error: insertError } = await supabase
          .from('supplier_labels')
          .insert(inserts as any);
        
        if (insertError) throw insertError;
      }
      
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplier_labels', variables.supplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier_labels'] });
    },
  });
}
