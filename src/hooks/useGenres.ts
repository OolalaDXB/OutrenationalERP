import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Genre {
  id: string;
  name: string;
  slug: string | null;
  parent_id: string | null;
}

export interface ProductGenre {
  product_id: string;
  genre_id: string;
}

export function useGenres() {
  return useQuery({
    queryKey: ["genres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("genres")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Genre[];
    },
  });
}

export function useProductGenres() {
  return useQuery({
    queryKey: ["product_genres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_genres")
        .select("*");

      if (error) throw error;
      return data as ProductGenre[];
    },
  });
}
