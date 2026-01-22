import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BankAccount {
  id: string;
  bank_name: string;
  iban: string;
  bic: string;
  currency: string;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccountInsert {
  bank_name: string;
  iban: string;
  bic: string;
  currency: string;
  is_default?: boolean;
}

export function useBankAccounts() {
  return useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("*")
        .order("currency", { ascending: true })
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BankAccount[];
    },
  });
}

export function useBankAccountsByCurrency(currency: string) {
  return useQuery({
    queryKey: ["bank-accounts", currency],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("*")
        .eq("currency", currency)
        .eq("active", true)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as BankAccount[];
    },
  });
}

export function useDefaultBankAccount(currency: string) {
  return useQuery({
    queryKey: ["bank-accounts", "default", currency],
    queryFn: async () => {
      let { data, error } = await supabase
        .from("bank_accounts" as any)
        .select("*")
        .eq("currency", currency)
        .eq("is_default", true)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: fallback, error: fallbackError } = await supabase
          .from("bank_accounts" as any)
          .select("*")
          .eq("currency", currency)
          .eq("active", true)
          .limit(1)
          .maybeSingle();
        if (fallbackError) throw fallbackError;
        data = fallback;
      }
      if (!data && currency !== 'EUR') {
        const { data: eurData, error: eurError } = await supabase
          .from("bank_accounts" as any)
          .select("*")
          .eq("currency", 'EUR')
          .eq("is_default", true)
          .eq("active", true)
          .maybeSingle();
        if (eurError) throw eurError;
        data = eurData;
      }
      return data as unknown as BankAccount | null;
    },
    enabled: !!currency,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (account: BankAccountInsert) => {
      if (account.is_default) {
        await supabase.from("bank_accounts" as any).update({ is_default: false } as any).eq("currency", account.currency).eq("is_default", true);
      }
      const { data, error } = await supabase.from("bank_accounts" as any).insert(account as any).select().single();
      if (error) throw error;
      return data as unknown as BankAccount;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-accounts"] }); },
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankAccount> & { id: string }) => {
      if (updates.is_default) {
        const { data: current } = await supabase.from("bank_accounts" as any).select("currency").eq("id", id).single();
        if (current) {
          await supabase.from("bank_accounts" as any).update({ is_default: false } as any).eq("currency", (current as any).currency).eq("is_default", true).neq("id", id);
        }
      }
      const { data, error } = await supabase.from("bank_accounts" as any).update({ ...updates, updated_at: new Date().toISOString() } as any).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as BankAccount;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-accounts"] }); },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_accounts" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank-accounts"] }); },
  });
}
