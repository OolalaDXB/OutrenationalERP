import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ImportHistory {
  id: string;
  entity_type: string;
  file_name: string | null;
  records_created: number;
  records_updated: number;
  user_id: string | null;
  user_email: string | null;
  status: string;
  rolled_back_at: string | null;
  created_at: string;
}

export interface ImportCreatedRecord {
  id: string;
  import_id: string;
  record_id: string;
  entity_type: string;
  created_at: string;
}

export function useImportHistory(entityType?: string) {
  return useQuery({
    queryKey: ['import_history', entityType],
    queryFn: async () => {
      let query = supabase
        .from('import_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ImportHistory[];
    },
  });
}

export function useCreateImportHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      fileName,
      recordsCreated,
      recordsUpdated,
      createdRecordIds,
    }: {
      entityType: string;
      fileName?: string;
      recordsCreated: number;
      recordsUpdated: number;
      createdRecordIds: string[];
    }) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create import history record
      const { data: importHistory, error: historyError } = await supabase
        .from('import_history')
        .insert({
          entity_type: entityType,
          file_name: fileName,
          records_created: recordsCreated,
          records_updated: recordsUpdated,
          user_id: user?.id,
          user_email: user?.email,
        })
        .select()
        .single();

      if (historyError) throw historyError;

      // Create records for each created item
      if (createdRecordIds.length > 0) {
        const recordsToInsert = createdRecordIds.map(recordId => ({
          import_id: importHistory.id,
          record_id: recordId,
          entity_type: entityType,
        }));

        const { error: recordsError } = await supabase
          .from('import_created_records')
          .insert(recordsToInsert);

        if (recordsError) throw recordsError;
      }

      return importHistory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import_history'] });
    },
  });
}

export function useRollbackImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      // Get import history to determine entity type
      const { data: importHistory, error: historyError } = await supabase
        .from('import_history')
        .select('*')
        .eq('id', importId)
        .single();

      if (historyError) throw historyError;

      // Get all created records for this import
      const { data: createdRecords, error: recordsError } = await supabase
        .from('import_created_records')
        .select('record_id, entity_type')
        .eq('import_id', importId);

      if (recordsError) throw recordsError;

      if (!createdRecords || createdRecords.length === 0) {
        throw new Error("Aucun enregistrement à supprimer pour cet import");
      }

      // Delete records based on entity type
      const recordIds = createdRecords.map(r => r.record_id);
      const entityType = importHistory.entity_type;

      let deleteError;
      if (entityType === 'products') {
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', recordIds);
        deleteError = error;
      } else if (entityType === 'customers') {
        const { error } = await supabase
          .from('customers')
          .delete()
          .in('id', recordIds);
        deleteError = error;
      } else if (entityType === 'suppliers') {
        const { error } = await supabase
          .from('suppliers')
          .delete()
          .in('id', recordIds);
        deleteError = error;
      }

      if (deleteError) throw deleteError;

      // Update import history status
      const { error: updateError } = await supabase
        .from('import_history')
        .update({
          status: 'rolled_back',
          rolled_back_at: new Date().toISOString(),
        })
        .eq('id', importId);

      if (updateError) throw updateError;

      return { deletedCount: recordIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['import_history'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: "Import annulé",
        description: `${data.deletedCount} enregistrement(s) supprimé(s)`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'annuler l'import",
        variant: "destructive",
      });
    },
  });
}
