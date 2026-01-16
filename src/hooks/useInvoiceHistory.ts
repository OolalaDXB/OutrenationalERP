import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvoiceHistoryEntry {
  id: string;
  invoice_id: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

export function useInvoiceHistory(invoiceId: string | null) {
  return useQuery({
    queryKey: ["invoice-history", invoiceId],
    enabled: !!invoiceId,
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from("invoice_history")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as InvoiceHistoryEntry[];
    },
  });
}

export async function addInvoiceHistory(
  invoiceId: string,
  action: string,
  changes?: Record<string, { old: unknown; new: unknown }>,
  userEmail?: string
) {
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from("invoice_history").insert([{
    invoice_id: invoiceId,
    action,
    changes: changes ? JSON.parse(JSON.stringify(changes)) : null,
    user_id: user?.id || null,
    user_email: userEmail || user?.email || null,
  }]);

  if (error) {
    console.error("Error adding invoice history:", error);
  }
}
