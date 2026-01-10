import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export function useDashboardKpis() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_dashboard_kpis')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
  });
}

export function useSupplierSalesView() {
  return useQuery({
    queryKey: ['supplier-sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_supplier_sales')
        .select('*')
        .order('gross_sales', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
}
