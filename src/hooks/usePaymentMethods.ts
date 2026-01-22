import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentMethodConfig {
  email?: string;
  publishable_key?: string;
  secret_key?: string;
  wallet_address?: string;
  network?: string;
  [key: string]: string | undefined;
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  config: PaymentMethodConfig;
  display_order: number;
  currencies: string[];
  created_at: string;
  updated_at: string;
}

export function usePaymentMethods(activeOnly = false) {
  return useQuery({
    queryKey: ["payment-methods", activeOnly],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_methods" as any).select("*").order("display_order", { ascending: true });
      if (error) throw error;
      const methods = (data || []).map((m: any) => ({ ...m, config: (m.config || {}) as PaymentMethodConfig, currencies: m.currencies || ['EUR'] })) as PaymentMethod[];
      return activeOnly ? methods.filter(m => m.active) : methods;
    },
  });
}

export function useActivePaymentMethodsForCurrency(currency: string) {
  return useQuery({
    queryKey: ["payment-methods", "active", currency],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_methods" as any).select("*").eq("active", true).order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []).map((m: any) => ({ ...m, config: (m.config || {}) as PaymentMethodConfig, currencies: m.currencies || ['EUR'] })).filter((m: PaymentMethod) => m.currencies.includes(currency)) as PaymentMethod[];
    },
    enabled: !!currency,
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentMethod> & { id: string }) => {
      const { data, error } = await supabase.from("payment_methods" as any).update({ ...updates, updated_at: new Date().toISOString() } as any).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as PaymentMethod;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payment-methods"] }); },
  });
}

export function useTogglePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase.from("payment_methods" as any).update({ active, updated_at: new Date().toISOString() } as any).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as PaymentMethod;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payment-methods"] }); },
  });
}

export function useUpdatePaymentMethodConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, config }: { id: string; config: PaymentMethodConfig }) => {
      const { data, error } = await supabase.from("payment_methods" as any).update({ config, updated_at: new Date().toISOString() } as any).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as PaymentMethod;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payment-methods"] }); },
  });
}
