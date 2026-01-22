import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProAuth } from '@/hooks/useProAuth';
import type { Tables } from '@/integrations/supabase/types';

export type ProInvoice = Tables<'invoices'> & {
  order?: {
    order_number: string;
  } | null;
};

export function useProInvoices() {
  const { customer } = useProAuth();

  return useQuery({
    queryKey: ['pro-invoices', customer?.id],
    queryFn: async (): Promise<ProInvoice[]> => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          order:orders(order_number)
        `)
        .eq('customer_id', customer.id)
        .order('issue_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id
  });
}

export function useRecentProInvoices(limit: number = 3) {
  const { customer } = useProAuth();

  return useQuery({
    queryKey: ['pro-invoices-recent', customer?.id, limit],
    queryFn: async (): Promise<ProInvoice[]> => {
      if (!customer?.id) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          order:orders(order_number)
        `)
        .eq('customer_id', customer.id)
        .order('issue_date', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id
  });
}
