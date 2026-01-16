import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Settings {
  id: string;
  shop_name: string;
  legal_name: string | null;
  shop_email: string | null;
  shop_phone: string | null;
  shop_address: string | null;
  shop_city: string | null;
  shop_postal_code: string | null;
  shop_country: string | null;
  vat_number: string | null;
  siret: string | null;
  vat_rate: number | null;
  default_currency: string | null;
  invoice_prefix: string | null;
  invoice_next_number: number | null;
  payout_invoice_prefix: string | null;
  payout_invoice_next_number: number | null;
  primary_color: string | null;
  shop_logo_url: string | null;
  // New invoice customization fields
  payment_terms_text: string | null;
  legal_mentions: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  eori: string | null;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data as Settings;
    }
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      // Get current settings to get the ID
      const { data: current, error: fetchError } = await supabase
        .from('settings')
        .select('id')
        .limit(1)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { data, error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', current.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });
}

// Function to get and increment payout invoice number
export async function getNextPayoutInvoiceNumber(): Promise<{ prefix: string; number: number; full: string }> {
  const { data, error } = await supabase
    .from('settings')
    .select('payout_invoice_prefix, payout_invoice_next_number, id')
    .limit(1)
    .single();
  
  if (error) throw error;
  
  const prefix = data.payout_invoice_prefix || 'REV';
  const number = data.payout_invoice_next_number || 1;
  const full = `${prefix}-${String(number).padStart(5, '0')}`;
  
  // Increment the next number
  await supabase
    .from('settings')
    .update({ payout_invoice_next_number: number + 1 })
    .eq('id', data.id);
  
  return { prefix, number, full };
}
