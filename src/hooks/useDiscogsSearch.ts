import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DiscogsImage {
  uri: string;
  type: string;
  width?: number;
  height?: number;
}

export interface DiscogsResult {
  id: number;
  title: string;
  year?: string;
  country?: string;
  label?: string[];
  format?: string[];
  thumb: string;
  cover_image: string;
  images: DiscogsImage[];
}

export interface DiscogsSearchResponse {
  results: DiscogsResult[];
  total: number;
}

export function useDiscogsSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<DiscogsResult[]>([]);

  const searchByBarcode = async (barcode: string): Promise<DiscogsResult[]> => {
    setIsSearching(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('discogs-search', {
        body: { barcode, type: 'release' },
      });

      if (error) throw error;

      const searchResults = data.results || [];
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de recherche Discogs';
      setError(message);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  const searchByQuery = async (query: string): Promise<DiscogsResult[]> => {
    setIsSearching(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('discogs-search', {
        body: { query, type: 'release' },
      });

      if (error) throw error;

      const searchResults = data.results || [];
      setResults(searchResults);
      return searchResults;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de recherche Discogs';
      setError(message);
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setError(null);
  };

  return {
    isSearching,
    error,
    results,
    searchByBarcode,
    searchByQuery,
    clearResults,
  };
}
