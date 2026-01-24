import { useState, useCallback } from 'react';
import { parseCapabilityError, type CapabilityError } from '@/lib/capability-errors';

/**
 * Hook to manage capability error state for showing UpgradePrompt.
 * 
 * Usage:
 * ```tsx
 * const { capabilityError, handleError, clearError } = useCapabilityError();
 * 
 * const handleSubmit = async () => {
 *   try {
 *     await supabase.rpc('protected_function');
 *   } catch (error) {
 *     if (handleError(error)) return; // Was a capability error, prompt shown
 *     // Handle other errors...
 *   }
 * };
 * 
 * return (
 *   <>
 *     <YourComponent />
 *     <UpgradePrompt 
 *       capability={capabilityError?.capability || ''} 
 *       open={!!capabilityError} 
 *       onClose={clearError} 
 *     />
 *   </>
 * );
 * ```
 */
export function useCapabilityError() {
  const [capabilityError, setCapabilityError] = useState<CapabilityError | null>(null);

  /**
   * Try to handle an error as a capability error.
   * Returns true if it was a capability error and was handled.
   * Returns false if it's a different type of error.
   */
  const handleError = useCallback((error: unknown): boolean => {
    const parsed = parseCapabilityError(error);
    if (parsed) {
      setCapabilityError(parsed);
      return true;
    }
    return false;
  }, []);

  /**
   * Clear the capability error (close the prompt).
   */
  const clearError = useCallback(() => {
    setCapabilityError(null);
  }, []);

  return {
    capabilityError,
    handleError,
    clearError,
  };
}
