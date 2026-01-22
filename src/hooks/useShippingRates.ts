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
  rate_type: 'flat' | 'per_weight' | 'per_item' | 'combined';
  per_kg_price: number | null;
  per_item_price: number | null;
  max_weight: number | null;
  max_items: number | null;
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

export interface UpdateShippingRateParams {
  zoneId: string;
  price: number;
  freeAbove: number | null;
  rateType?: 'flat' | 'per_weight' | 'per_item' | 'combined';
  perKgPrice?: number | null;
  perItemPrice?: number | null;
  maxWeight?: number | null;
  maxItems?: number | null;
}

export function useUpdateShippingRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateShippingRateParams) => {
      const { zoneId, price, freeAbove, rateType = 'flat', perKgPrice, perItemPrice, maxWeight, maxItems } = params;
      
      // Check if rate exists for this zone
      const { data: existingRate } = await fromTable('shipping_rates')
        .select('id')
        .eq('zone_id', zoneId)
        .limit(1)
        .single();

      const rateData = {
        price,
        free_above: freeAbove,
        rate_type: rateType,
        per_kg_price: perKgPrice ?? null,
        per_item_price: perItemPrice ?? null,
        max_weight: maxWeight ?? null,
        max_items: maxItems ?? null
      };

      if (existingRate) {
        // Update existing rate
        const { data, error } = await fromTable('shipping_rates')
          .update(rateData)
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
            min_total: 0,
            ...rateData
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

export interface ShippingCalculationParams {
  countryCode: string | null | undefined;
  subtotalHT: number;
  totalWeight?: number; // in kg
  itemCount?: number;
}

export interface ShippingCalculationResult {
  zone: string;
  zoneName: string;
  baseCost: number;
  freeThreshold: number | null;
  isFree: boolean;
  finalCost: number;
  rateType: string;
  breakdown?: {
    basePrice: number;
    weightPrice?: number;
    itemPrice?: number;
  };
}

/**
 * Calculate shipping for a given country code, subtotal, weight, and item count
 * Uses the database shipping zones and rates
 */
export async function calculateDynamicShipping(params: ShippingCalculationParams): Promise<ShippingCalculationResult> {
  const { countryCode, subtotalHT, totalWeight = 0, itemCount = 1 } = params;
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
      finalCost: subtotalHT >= 350 ? 0 : 25,
      rateType: 'flat'
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
      finalCost: subtotalHT >= 350 ? 0 : 25,
      rateType: 'flat'
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
      finalCost: 0,
      rateType: 'flat'
    };
  }

  // Calculate cost based on rate type
  let calculatedCost = rate.price; // Base price
  const breakdown: ShippingCalculationResult['breakdown'] = { basePrice: rate.price };
  const rateType = rate.rate_type || 'flat';

  if (rateType === 'per_weight' && rate.per_kg_price && totalWeight > 0) {
    const weightPrice = totalWeight * rate.per_kg_price;
    calculatedCost = rate.price + weightPrice;
    breakdown.weightPrice = weightPrice;
  } else if (rateType === 'per_item' && rate.per_item_price && itemCount > 1) {
    const additionalItems = itemCount - 1;
    const itemPrice = additionalItems * rate.per_item_price;
    calculatedCost = rate.price + itemPrice;
    breakdown.itemPrice = itemPrice;
  } else if (rateType === 'combined') {
    let extraCost = 0;
    if (rate.per_kg_price && totalWeight > 0) {
      breakdown.weightPrice = totalWeight * rate.per_kg_price;
      extraCost += breakdown.weightPrice;
    }
    if (rate.per_item_price && itemCount > 1) {
      breakdown.itemPrice = (itemCount - 1) * rate.per_item_price;
      extraCost += breakdown.itemPrice;
    }
    calculatedCost = rate.price + extraCost;
  }

  const isFree = rate.free_above !== null && subtotalHT >= rate.free_above;

  return {
    zone: zone.name.toLowerCase(),
    zoneName: zone.name,
    baseCost: calculatedCost,
    freeThreshold: rate.free_above,
    isFree,
    finalCost: isFree ? 0 : calculatedCost,
    rateType,
    breakdown
  };
}
