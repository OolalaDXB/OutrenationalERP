import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Artist = Tables<'artists'>;
export type ArtistInsert = Omit<TablesInsert<'artists'>, 'tenant_id'>;
export type ArtistUpdate = TablesUpdate<'artists'>;

export function useArtists() {
  return useQuery({
    queryKey: ['artists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });
}

export function useArtist(id: string) {
  return useQuery({
    queryKey: ['artists', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });
}

export function useCreateArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (artist: ArtistInsert) => {
      const { data, error } = await supabase
        .from('artists')
        .insert(artist as TablesInsert<'artists'>)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
    }
  });
}

export function useUpdateArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ArtistUpdate) => {
      const { data, error } = await supabase
        .from('artists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['artists', variables.id] });
    }
  });
}

export function useDeleteArtist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artists'] });
    }
  });
}
