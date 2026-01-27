import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Label = Tables<'labels'>;
export type LabelInsert = Omit<TablesInsert<'labels'>, 'tenant_id'>;
export type LabelUpdate = TablesUpdate<'labels'>;

export interface LabelWithSupplier extends Label {
  suppliers?: { id: string; name: string } | null;
}

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labels')
        .select(`
          *,
          suppliers:supplier_id (id, name)
        `)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as LabelWithSupplier[];
    }
  });
}

export function useLabel(id: string | null) {
  return useQuery({
    queryKey: ['labels', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Label;
    },
    enabled: !!id,
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (label: LabelInsert) => {
      const { data, error } = await supabase
        .from('labels')
        .insert(label as TablesInsert<'labels'>)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast({ title: 'Label créé', description: 'Le label a été ajouté avec succès' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });
}

export function useUpdateLabel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: LabelUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast({ title: 'Label modifié', description: 'Les modifications ont été enregistrées' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      toast({ title: 'Label supprimé', description: 'Le label a été supprimé' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    }
  });
}
