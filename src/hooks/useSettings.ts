import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WidgetVisibility, WidgetOrder } from '@/components/settings/WidgetVisibilitySection';

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
  // Invoice customization fields
  payment_terms_text: string | null;
  legal_mentions: string | null;
  bank_name: string | null;
  iban: string | null;
  bic: string | null;
  eori: string | null;
  cgv: string | null;
  // Feature toggles
  show_artists_section: boolean | null;
  // Widget visibility and order
  visible_widgets: WidgetVisibility | null;
  widget_order: WidgetOrder | null;
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
      return {
        ...data,
        visible_widgets: data.visible_widgets as unknown as WidgetVisibility | null,
        widget_order: data.widget_order as unknown as WidgetOrder | null,
      } as Settings;
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
      
      // Convert visible_widgets and widget_order to JSON-compatible format
      const updatePayload = {
        ...updates,
        visible_widgets: updates.visible_widgets ? updates.visible_widgets as unknown as Record<string, boolean> : undefined,
        widget_order: updates.widget_order ? updates.widget_order as unknown as Record<string, string[]> : undefined,
      };
      
      const { data, error } = await supabase
        .from('settings')
        .update(updatePayload)
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
