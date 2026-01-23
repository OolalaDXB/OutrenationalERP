import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProAuth } from '@/hooks/useProAuth';
import type { Tables } from '@/integrations/supabase/types';

export type ProInvoice = Tables<'invoices'> & {
  order?: {
    order_number: string;
  } | null;
};

async function fetchProInvoices(customerId: string): Promise<ProInvoice[]> {
  // First, try to fetch invoices directly by customer_id
  const { data: directInvoices, error: directError } = await supabase
    .from('invoices')
    .select(`
      *,
      order:orders(order_number)
    `)
    .eq('customer_id', customerId)
    .order('issue_date', { ascending: false });

  if (directError) throw directError;

  // If we found invoices by customer_id, return them
  if (directInvoices && directInvoices.length > 0) {
    return directInvoices;
  }

  // Fallback: fetch orders for this customer, then fetch invoices by order_id
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_id', customerId);

  if (ordersError) throw ordersError;

  if (!orders || orders.length === 0) {
    return [];
  }

  const orderIds = orders.map(o => o.id);

  const { data: orderInvoices, error: orderInvoicesError } = await supabase
    .from('invoices')
    .select(`
      *,
      order:orders(order_number)
    `)
    .in('order_id', orderIds)
    .order('issue_date', { ascending: false });

  if (orderInvoicesError) throw orderInvoicesError;

  // Merge and deduplicate (in case some were found both ways)
  const allInvoices = [...(directInvoices || []), ...(orderInvoices || [])];
  const uniqueInvoices = allInvoices.reduce((acc, invoice) => {
    if (!acc.find(i => i.id === invoice.id)) {
      acc.push(invoice);
    }
    return acc;
  }, [] as ProInvoice[]);

  // Sort by issue_date desc
  return uniqueInvoices.sort((a, b) => 
    new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
  );
}

export function useProInvoices() {
  const { customer } = useProAuth();

  return useQuery({
    queryKey: ['pro-invoices', customer?.id],
    queryFn: () => fetchProInvoices(customer!.id),
    enabled: !!customer?.id
  });
}

export function useRecentProInvoices(limit: number = 3) {
  const { customer } = useProAuth();

  return useQuery({
    queryKey: ['pro-invoices-recent', customer?.id, limit],
    queryFn: async (): Promise<ProInvoice[]> => {
      if (!customer?.id) return [];
      
      const invoices = await fetchProInvoices(customer.id);
      return invoices.slice(0, limit);
    },
    enabled: !!customer?.id
  });
}
