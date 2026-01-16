import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VatCacheEntry {
  id: string;
  vat_number: string;
  country_code: string;
  is_valid: boolean;
  company_name: string | null;
  company_address: string | null;
  validated_at: string;
  expires_at: string;
  created_at: string;
}

export interface VatCacheStats {
  total: number;
  valid: number;
  invalid: number;
  expired: number;
  byCountry: Record<string, number>;
}

export function useVatCache() {
  return useQuery({
    queryKey: ['vat-cache'],
    queryFn: async (): Promise<VatCacheEntry[]> => {
      const { data, error } = await supabase
        .from('vat_validations_cache')
        .select('*')
        .order('validated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as VatCacheEntry[];
    },
  });
}

export function useVatCacheStats() {
  return useQuery({
    queryKey: ['vat-cache-stats'],
    queryFn: async (): Promise<VatCacheStats> => {
      const { data, error } = await supabase
        .from('vat_validations_cache')
        .select('*');

      if (error) throw error;

      const entries = (data || []) as VatCacheEntry[];
      const now = new Date();

      const stats: VatCacheStats = {
        total: entries.length,
        valid: entries.filter(e => e.is_valid).length,
        invalid: entries.filter(e => !e.is_valid).length,
        expired: entries.filter(e => new Date(e.expires_at) < now).length,
        byCountry: {},
      };

      entries.forEach(entry => {
        const country = entry.country_code;
        stats.byCountry[country] = (stats.byCountry[country] || 0) + 1;
      });

      return stats;
    },
  });
}

export function useDeleteVatCacheEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vat_validations_cache')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vat-cache'] });
      queryClient.invalidateQueries({ queryKey: ['vat-cache-stats'] });
    },
  });
}

export function usePurgeExpiredCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('vat_validations_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vat-cache'] });
      queryClient.invalidateQueries({ queryKey: ['vat-cache-stats'] });
    },
  });
}

export function usePurgeAllCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('vat_validations_cache')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vat-cache'] });
      queryClient.invalidateQueries({ queryKey: ['vat-cache-stats'] });
    },
  });
}
