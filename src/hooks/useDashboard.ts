import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';

// Dashboard KPIs type - not generated in types.ts
interface DashboardKpis {
  revenue_30d: number;
  orders_30d: number;
  new_customers_30d: number;
  low_stock_alerts: number;
  active_suppliers: number;
}

export function useDashboardKpis() {
  return useQuery({
    queryKey: ['dashboard', 'kpis'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('v_dashboard_kpis')
          .select('*')
          .single();
        if (error) throw error;
        return data as unknown as DashboardKpis;
      })();

      return withTimeout(request, 15000, 'Timeout lors du chargement du dashboard.');
    }
  });
}

export function useSupplierSalesView() {
  return useQuery({
    queryKey: ['supplier-sales'],
    retry: false,
    queryFn: async () => {
      const request = (async () => {
        const { data, error } = await supabase
          .from('v_supplier_sales')
          .select('*')
          .order('gross_sales', { ascending: false });
        if (error) throw error;
        return data;
      })();

      return withTimeout(request, 15000, 'Timeout lors du chargement des ventes fournisseurs.');
    }
  });
}

