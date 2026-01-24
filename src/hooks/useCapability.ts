import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CbacOverride {
  enabled?: boolean;
  value?: unknown;
  expires_at?: string;
  created_at?: string;
  created_by?: string;
  reason?: string;
}

interface CbacConfig {
  plan_code: string | null;
  plan_version: string | null;
  capabilities: Record<string, unknown>;
  overrides: Record<string, CbacOverride>;
}

/**
 * Hook to access CBAC (Capability-Based Access Control) configuration.
 * 
 * IMPORTANT: This is for UI/UX convenience only!
 * Backend guards (assert_cbac) are the authority - never trust client-side checks for security.
 */
export function useCapability() {
  const { data: cbacConfig, isLoading, error, refetch } = useQuery({
    queryKey: ['cbac-config'],
    queryFn: async (): Promise<CbacConfig | null> => {
      const { data, error } = await supabase.rpc('get_cbac');
      
      if (error) {
        console.error('Failed to fetch CBAC config:', error);
        throw error;
      }
      
      // Handle the JSON response from Supabase RPC
      if (!data) return null;
      return data as unknown as CbacConfig;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    retry: 2,
  });

  /**
   * Check if a capability is enabled (boolean capability).
   * Checks overrides first (with expiration), then base capabilities.
   */
  const isEnabled = (capabilityId: string): boolean => {
    if (!cbacConfig) return false;

    // Check override first
    const override = cbacConfig.overrides?.[capabilityId];
    if (override) {
      // Check expiration
      if (override.expires_at) {
        const expiresAt = new Date(override.expires_at);
        if (expiresAt < new Date()) {
          // Override expired, fall through to base capability
        } else if (override.enabled !== undefined) {
          return override.enabled;
        }
      } else if (override.enabled !== undefined) {
        return override.enabled;
      }
    }

    // Fall back to base capability
    const baseValue = cbacConfig.capabilities?.[capabilityId];
    return typeof baseValue === 'boolean' ? baseValue : false;
  };

  /**
   * Get a numeric limit for a capability.
   * Returns 0 if not defined (0 or negative = unlimited in most contexts).
   */
  const getLimit = (capabilityId: string): number => {
    if (!cbacConfig) return 0;

    // Check override first
    const override = cbacConfig.overrides?.[capabilityId];
    if (override) {
      if (override.expires_at) {
        const expiresAt = new Date(override.expires_at);
        if (expiresAt < new Date()) {
          // Expired
        } else if (typeof override.value === 'number') {
          return override.value;
        }
      } else if (typeof override.value === 'number') {
        return override.value;
      }
    }

    // Fall back to base
    const baseValue = cbacConfig.capabilities?.[capabilityId];
    return typeof baseValue === 'number' ? baseValue : 0;
  };

  /**
   * Check if an array capability contains a specific value.
   * Returns true if the array contains 'all' or the specific value.
   */
  const arrayContains = (capabilityId: string, value: string): boolean => {
    if (!cbacConfig) return false;

    let arr: unknown[] | null = null;

    // Check override first
    const override = cbacConfig.overrides?.[capabilityId];
    if (override) {
      if (override.expires_at) {
        const expiresAt = new Date(override.expires_at);
        if (expiresAt >= new Date() && Array.isArray(override.value)) {
          arr = override.value;
        }
      } else if (Array.isArray(override.value)) {
        arr = override.value;
      }
    }

    // Fall back to base if no valid override
    if (!arr) {
      const baseValue = cbacConfig.capabilities?.[capabilityId];
      if (Array.isArray(baseValue)) {
        arr = baseValue;
      }
    }

    if (!arr) return false;

    // Check for 'all' wildcard or specific value
    return arr.includes('all') || arr.includes(value);
  };

  /**
   * Get the current plan info.
   */
  const getPlanInfo = () => ({
    planCode: cbacConfig?.plan_code ?? null,
    planVersion: cbacConfig?.plan_version ?? null,
  });

  /**
   * Get raw capability value (for advanced use cases).
   */
  const getRawCapability = (capabilityId: string): unknown => {
    if (!cbacConfig) return undefined;
    return cbacConfig.capabilities?.[capabilityId];
  };

  /**
   * Get raw override (for debugging/admin UI).
   */
  const getOverride = (capabilityId: string): CbacOverride | undefined => {
    return cbacConfig?.overrides?.[capabilityId];
  };

  return {
    // State
    isLoading,
    error,
    config: cbacConfig,
    
    // Helpers
    isEnabled,
    getLimit,
    arrayContains,
    getPlanInfo,
    getRawCapability,
    getOverride,
    
    // Actions
    refetch,
  };
}

/**
 * Simple hook to check a single capability.
 * Use when you only need to check one capability in a component.
 */
export function useIsCapabilityEnabled(capabilityId: string): {
  enabled: boolean;
  isLoading: boolean;
} {
  const { isEnabled, isLoading } = useCapability();
  return {
    enabled: isEnabled(capabilityId),
    isLoading,
  };
}
