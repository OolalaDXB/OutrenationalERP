import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export type InvoiceInsert = TablesInsert<'invoices'>;

/**
 * Get next invoice number and increment
 */
export async function getNextInvoiceNumber(): Promise<{ prefix: string; number: number; full: string }> {
  const { data, error } = await supabase
    .from('settings')
    .select('invoice_prefix, invoice_next_number, id')
    .limit(1)
    .single();
  
  if (error) throw error;
  
  const prefix = data.invoice_prefix || 'FC';
  const number = data.invoice_next_number || 1;
  const full = `${prefix}-${String(number).padStart(5, '0')}`;
  
  // Increment the next number
  await supabase
    .from('settings')
    .update({ invoice_next_number: number + 1 })
    .eq('id', data.id);
  
  return { prefix, number, full };
}

/**
 * Check if an invoice exists for a given order
 */
export function useInvoiceForOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['invoice-for-order', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!orderId
  });
}

/**
 * Create an invoice from an order
 */
export function useCreateInvoiceFromOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      orderId,
      customerId,
      recipientName,
      recipientEmail,
      recipientAddress,
      subtotal,
      taxAmount,
      total,
      currency
    }: {
      orderId: string;
      customerId?: string | null;
      recipientName: string;
      recipientEmail?: string | null;
      recipientAddress?: string | null;
      subtotal: number;
      taxAmount?: number | null;
      total: number;
      currency?: string | null;
    }) => {
      // Get next invoice number
      const invoiceInfo = await getNextInvoiceNumber();
      
      // Create invoice
      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceInfo.full,
          type: 'customer',
          order_id: orderId,
          customer_id: customerId,
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          recipient_address: recipientAddress,
          issue_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 days
          subtotal,
          tax_amount: taxAmount || 0,
          total,
          currency: currency || 'EUR',
          status: 'sent'
        })
        .select()
        .single();
      
      if (error) throw error;
      return invoice;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-for-order', variables.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  });
}

/**
 * Create invoice items from order items
 */
export function useCreateInvoiceItems() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      invoiceId,
      items
    }: {
      invoiceId: string;
      items: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        total_price: number;
        product_id?: string | null;
      }>;
    }) => {
      const invoiceItems = items.map(item => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_id: item.product_id
      }));
      
      const { data, error } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}
