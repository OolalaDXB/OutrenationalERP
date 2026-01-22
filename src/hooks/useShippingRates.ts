import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  created_at: string;
}

export interface ShippingRate {
  id: string;
  zone_id: string;
  min_total: number;
  price: number;
  free_above: number | null;
  created_at: string;
}

export interface ShippingZoneWithRate extends ShippingZone {
  rate: ShippingRate | null;
}

// Type assertion helper for new tables not yet in generated types
const fromTable = (table: string) => supabase.from(table as any);

export function useShippingZones() {
  return useQuery({
    queryKey: ['shipping-zones'],
    queryFn: async () => {
      const { data, error } = await fromTable('shipping_zones')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as ShippingZone[];
    }
  });
}

export function useShippingRates() {
  return useQuery({
    queryKey: ['shipping-rates'],
    queryFn: async () => {
      const { data, error } = await fromTable('shipping_rates')
        .select('*')
        .order('min_total', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as ShippingRate[];
    }
  });
}

export function useShippingZonesWithRates() {
  return useQuery({
    queryKey: ['shipping-zones-with-rates'],
    queryFn: async () => {
      const { data: zones, error: zonesError } = await fromTable('shipping_zones')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (zonesError) throw zonesError;

      const { data: rates, error: ratesError } = await fromTable('shipping_rates')
        .select('*')
        .order('min_total', { ascending: true });
      
      if (ratesError) throw ratesError;

      const typedZones = (zones || []) as unknown as ShippingZone[];
      const typedRates = (rates || []) as unknown as ShippingRate[];

      const zonesWithRates: ShippingZoneWithRate[] = typedZones.map(zone => ({
        ...zone,
        rate: typedRates.find(r => r.zone_id === zone.id) || null
      }));

      return zonesWithRates;
    }
  });
}

export function useUpdateShippingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, countries }: { id: string; countries: string[] }) => {
      const { data, error } = await fromTable('shipping_zones')
        .update({ countries })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones-with-rates'] });
    }
  });
}

export function useUpdateShippingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      zoneId, 
      price, 
      freeAbove 
    }: { 
      zoneId: string; 
      price: number; 
      freeAbove: number | null;
    }) => {
      // Check if rate exists for this zone
      const { data: existingRate } = await fromTable('shipping_rates')
        .select('id')
        .eq('zone_id', zoneId)
        .limit(1)
        .single();

      if (existingRate) {
        // Update existing rate
        const { data, error } = await fromTable('shipping_rates')
          .update({ 
            price, 
            free_above: freeAbove 
          })
          .eq('id', (existingRate as any).id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Create new rate
        const { data, error } = await fromTable('shipping_rates')
          .insert({ 
            zone_id: zoneId,
            price, 
            free_above: freeAbove,
            min_total: 0
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-rates'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones-with-rates'] });
    }
  });
}

export function useCreateShippingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, countries }: { name: string; countries: string[] }) => {
      const { data, error } = await fromTable('shipping_zones')
        .insert({ name, countries })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones-with-rates'] });
    }
  });
}

export function useDeleteShippingZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await fromTable('shipping_zones')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-zones'] });
      queryClient.invalidateQueries({ queryKey: ['shipping-zones-with-rates'] });
    }
  });
}

/**
 * Calculate shipping for a given country code and subtotal
 * Uses the database shipping zones and rates
 */
export async function calculateDynamicShipping(countryCode: string | null | undefined, subtotalHT: number): Promise<{
  zone: string;
  zoneName: string;
  baseCost: number;
  freeThreshold: number | null;
  isFree: boolean;
  finalCost: number;
}> {
  const normalizedCountry = (countryCode || '').trim().toUpperCase();

  // Fetch zones and rates
  const { data: zones } = await fromTable('shipping_zones')
    .select('*')
    .order('created_at', { ascending: true });

  const { data: rates } = await fromTable('shipping_rates')
    .select('*');

  if (!zones || !rates) {
    // Fallback to default
    return {
      zone: 'world',
      zoneName: 'Monde',
      baseCost: 25,
      freeThreshold: 350,
      isFree: subtotalHT >= 350,
      finalCost: subtotalHT >= 350 ? 0 : 25
    };
  }

  // Find matching zone
  let matchedZone: ShippingZone | null = null;
  let fallbackZone: ShippingZone | null = null;
  const typedZones = (zones || []) as unknown as ShippingZone[];

  for (const zone of typedZones) {
    if (zone.countries.includes('*')) {
      fallbackZone = zone;
    } else if (zone.countries.some(c => c.toUpperCase() === normalizedCountry)) {
      matchedZone = zone;
      break;
    }
  }

  const zone = matchedZone || fallbackZone;

  if (!zone) {
    return {
      zone: 'world',
      zoneName: 'Monde',
      baseCost: 25,
      freeThreshold: 350,
      isFree: subtotalHT >= 350,
      finalCost: subtotalHT >= 350 ? 0 : 25
    };
  }

  // Find rate for zone
  const typedRates = (rates || []) as unknown as ShippingRate[];
  const rate = typedRates.find(r => r.zone_id === zone.id);

  if (!rate) {
    return {
      zone: zone.name.toLowerCase(),
      zoneName: zone.name,
      baseCost: 0,
      freeThreshold: null,
      isFree: true,
      finalCost: 0
    };
  }

  const isFree = rate.free_above !== null && subtotalHT >= rate.free_above;

  return {
    zone: zone.name.toLowerCase(),
    zoneName: zone.name,
    baseCost: rate.price,
    freeThreshold: rate.free_above,
    isFree,
    finalCost: isFree ? 0 : rate.price
  };
}
