import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface PaymentTransaction {
  id: string;
  invoice_number: string | null;
  issue_date: string | null;
  paid_at: string | null;
  due_date: string | null;
  total: number | null;
  subtotal: number | null;
  tax_amount: number | null;
  payment_status: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  customer_id: string | null;
}

export function usePaymentJournal(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ['payment-journal', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async (): Promise<PaymentTransaction[]> => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          issue_date,
          paid_date,
          due_date,
          total,
          subtotal,
          tax_amount,
          status,
          payment_method,
          payment_reference,
          recipient_name,
          recipient_email,
          customer_id
        `)
        .not('status', 'in', '("cancelled","draft")')
        .gte('issue_date', format(startDate, 'yyyy-MM-dd'))
        .lte('issue_date', format(endDate, 'yyyy-MM-dd'))
        .order('issue_date', { ascending: false });

      if (error) throw error;

      // Map status to payment_status for consistency
      return (data || []).map(inv => ({
        ...inv,
        paid_at: inv.paid_date,
        payment_status: inv.status === 'paid' ? 'paid' : 
                       inv.status === 'sent' ? 'pending' : 
                       inv.status === 'overdue' ? 'pending' : inv.status,
      }));
    },
  });
}
