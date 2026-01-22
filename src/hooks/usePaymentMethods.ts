import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

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

function parseConfig(config: Json | null): PaymentMethodConfig {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return {};
  }
  return config as PaymentMethodConfig;
}

function parseCurrencies(currencies: string[] | null): string[] {
  return currencies || ['EUR'];
}

export function usePaymentMethods(activeOnly = false) {
  return useQuery({
    queryKey: ["payment-methods", activeOnly],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (error) {
        console.error("Error fetching payment methods:", error);
        throw error;
      }
      
      const methods: PaymentMethod[] = (data || []).map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        description: m.description,
        icon: m.icon,
        active: m.active ?? false,
        config: parseConfig(m.config),
        display_order: m.display_order ?? 0,
        currencies: parseCurrencies(m.currencies),
        created_at: m.created_at ?? '',
        updated_at: m.updated_at ?? '',
      }));
      
      return activeOnly ? methods.filter(m => m.active) : methods;
    },
  });
}

export function useActivePaymentMethodsForCurrency(currency: string) {
  return useQuery({
    queryKey: ["payment-methods", "active", currency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true });
      
      if (error) {
        console.error("Error fetching active payment methods:", error);
        throw error;
      }
      
      const methods: PaymentMethod[] = (data || []).map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        description: m.description,
        icon: m.icon,
        active: m.active ?? false,
        config: parseConfig(m.config),
        display_order: m.display_order ?? 0,
        currencies: parseCurrencies(m.currencies),
        created_at: m.created_at ?? '',
        updated_at: m.updated_at ?? '',
      }));
      
      return methods.filter(m => m.currencies.includes(currency));
    },
    enabled: !!currency,
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PaymentMethod> & { id: string }) => {
      const { data, error } = await supabase
        .from("payment_methods")
        .update({ 
          ...updates, 
          config: updates.config as Json,
          updated_at: new Date().toISOString() 
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as PaymentMethod;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] }); 
    },
  });
}

export function useTogglePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from("payment_methods")
        .update({ active, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as PaymentMethod;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] }); 
    },
  });
}

export function useUpdatePaymentMethodConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, config }: { id: string; config: PaymentMethodConfig }) => {
      const { data, error } = await supabase
        .from("payment_methods")
        .update({ config: config as Json, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as unknown as PaymentMethod;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] }); 
    },
  });
}
