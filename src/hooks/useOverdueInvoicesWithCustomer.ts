import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface OverdueInvoiceWithCustomer {
  id: string;
  invoice_number: string | null;
  issue_date: string | null;
  due_date: string | null;
  total: number | null;
  subtotal: number | null;
  status: string | null;
  recipient_name: string | null;
  customer_id: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  company_name: string | null;
  days_overdue: number;
}

export function useOverdueInvoicesWithCustomer() {
  return useQuery({
    queryKey: ['overdue-invoices-with-customer'],
    queryFn: async (): Promise<OverdueInvoiceWithCustomer[]> => {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      // First get overdue invoices
      const { data: invoices, error: invError } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          issue_date,
          due_date,
          total,
          subtotal,
          status,
          recipient_name,
          customer_id
        `)
        .not('status', 'in', '("cancelled","draft","paid")')
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (invError) throw invError;

      // Get customer details for these invoices
      const customerIds = [...new Set((invoices || []).map(i => i.customer_id).filter(Boolean))];
      
      let customersMap: Record<string, { email: string | null; phone: string | null; company_name: string | null }> = {};
      
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, email, phone, company_name')
          .in('id', customerIds);
        
        if (customers) {
          customersMap = customers.reduce((acc, c) => {
            acc[c.id] = { email: c.email, phone: c.phone, company_name: c.company_name };
            return acc;
          }, {} as typeof customersMap);
        }
      }

      // Calculate days overdue and merge customer data
      const now = new Date();
      return (invoices || []).map(inv => {
        const dueDate = inv.due_date ? new Date(inv.due_date) : now;
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const customer = inv.customer_id ? customersMap[inv.customer_id] : null;

        return {
          ...inv,
          days_overdue: Math.max(0, daysOverdue),
          customer_email: customer?.email || null,
          customer_phone: customer?.phone || null,
          company_name: customer?.company_name || null,
        };
      });
    },
  });
}
