import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type SupplierPayout = Tables<'supplier_payouts'>;
export type SupplierPayoutInsert = TablesInsert<'supplier_payouts'>;
export type SupplierPayoutUpdate = TablesUpdate<'supplier_payouts'>;

export function useSupplierPayouts() {
  return useQuery({
    queryKey: ['supplier_payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_payouts')
        .select(`
          *,
          suppliers (name, type, email, iban, bic, bank_name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
}

export function useSupplierPayoutsBySupplier(supplierId: string) {
  return useQuery({
    queryKey: ['supplier_payouts', 'by_supplier', supplierId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_payouts')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!supplierId
  });
}

export function useCreateSupplierPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payout: SupplierPayoutInsert) => {
      const { data, error } = await supabase
        .from('supplier_payouts')
        .insert(payout)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_payouts'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
}

export function useUpdateSupplierPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & SupplierPayoutUpdate) => {
      const { data, error } = await supabase
        .from('supplier_payouts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_payouts'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
}

export function useMarkPayoutAsPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_reference }: { id: string; payment_reference?: string }) => {
      const { data, error } = await supabase
        .from('supplier_payouts')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_reference: payment_reference || null,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_payouts'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
}

export function useDeleteSupplierPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('supplier_payouts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier_payouts'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    }
  });
}
