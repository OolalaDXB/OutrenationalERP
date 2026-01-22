import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WidgetVisibility, WidgetOrder } from '@/components/settings/WidgetVisibilitySection';

export interface SalesChannel {
  id: string;
  name: string;
  url: string | null;
  enabled: boolean;
  icon?: string;
  builtin?: boolean;
}

export interface CustomMarketplaceMapping {
  sourceColumn: string;
  targetField: string;
}

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
  credit_note_prefix: string | null;
  credit_note_next_number: number | null;
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
  // Payment
  paypal_email: string | null;
  // Feature toggles
  show_artists_section: boolean | null;
  // Widget visibility and order
  visible_widgets: WidgetVisibility | null;
  widget_order: WidgetOrder | null;
  // Sales channels
  sales_channels: SalesChannel[] | null;
  // Custom marketplace column mappings
  custom_marketplace_mappings: Record<string, CustomMarketplaceMapping[]> | null;
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
      
      // Cast to handle new columns that may not be in generated types yet
      const rawData = data as Record<string, unknown>;
      
      return {
        ...data,
        credit_note_prefix: rawData.credit_note_prefix as string | null ?? 'AV',
        credit_note_next_number: rawData.credit_note_next_number as number | null ?? 1,
        visible_widgets: data.visible_widgets as unknown as WidgetVisibility | null,
        widget_order: data.widget_order as unknown as WidgetOrder | null,
        sales_channels: data.sales_channels as unknown as SalesChannel[] | null,
        custom_marketplace_mappings: rawData.custom_marketplace_mappings as Record<string, CustomMarketplaceMapping[]> | null,
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
      
      // Convert visible_widgets, widget_order, and sales_channels to JSON-compatible format
      const { id, ...rest } = updates;
      const updatePayload: Record<string, unknown> = { ...rest };
      
      if (updates.visible_widgets !== undefined) {
        updatePayload.visible_widgets = updates.visible_widgets;
      }
      if (updates.widget_order !== undefined) {
        updatePayload.widget_order = updates.widget_order;
      }
      if (updates.sales_channels !== undefined) {
        updatePayload.sales_channels = updates.sales_channels;
      }
      if (updates.custom_marketplace_mappings !== undefined) {
        updatePayload.custom_marketplace_mappings = updates.custom_marketplace_mappings;
      }
      
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

// Function to get and increment credit note number
export async function getNextCreditNoteNumber(): Promise<{ prefix: string; number: number; full: string }> {
  // Select all to avoid type issues with new columns
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .limit(1)
    .single();
  
  if (error) throw error;
  
  // Handle potentially missing columns with defaults
  const rawData = data as unknown as Record<string, unknown>;
  const prefix = (rawData.credit_note_prefix as string) || 'AV';
  const number = (rawData.credit_note_next_number as number) || 1;
  const full = `${prefix}-${String(number).padStart(5, '0')}`;
  
  // Increment the next number
  await supabase
    .from('settings')
    .update({ credit_note_next_number: number + 1 } as unknown as Record<string, never>)
    .eq('id', data.id);
  
  return { prefix, number, full };
}
