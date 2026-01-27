import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { withTimeout } from '@/lib/withTimeout';

export type Supplier = Tables<'suppliers'>;
export type SupplierInsert = Omit<TablesInsert<'suppliers'>, 'tenant_id'>;
export type SupplierUpdate = TablesUpdate<'suppliers'>;

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .is('deleted_at', null)
          .order('name');
        if (error) throw error;
        return data;
      })();

      return withTimeout(request, 15000, 'Timeout lors du chargement des fournisseurs.');
    }
  });
}

export function useSupplier(id: string) {
  return useQuery({
    queryKey: ['suppliers', id],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      })();

      return withTimeout(request, 15000, 'Timeout lors du chargement du fournisseur.');
    },
    enabled: !!id
  });
}

export function useActiveSuppliers() {
  return useQuery({
    queryKey: ['suppliers', 'active'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .is('deleted_at', null)
          .eq('active', true)
          .order('name');
        if (error) throw error;
        return data;
      })();

      return withTimeout(request, 15000, 'Timeout lors du chargement des fournisseurs actifs.');
    }
  });
}


export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplier: SupplierInsert) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier as TablesInsert<'suppliers'>)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & SupplierUpdate) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.id] });
    }
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
}

export function usePermanentDeleteSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
}

export function useDeletedSuppliers() {
  return useQuery({
    queryKey: ['suppliers', 'deleted'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .not('deleted_at', 'is', null)
          .order('deleted_at', { ascending: false });
        if (error) throw error;
        return data;
      })();
      return withTimeout(request, 15000, 'Timeout lors du chargement des fournisseurs supprimés.');
    }
  });
}

export function useRestoreSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .update({ deleted_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
}
