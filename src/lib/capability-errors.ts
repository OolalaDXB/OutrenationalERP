/**
 * Utility for handling CBAC capability errors from Supabase RPC calls.
 * 
 * Usage:
 * ```ts
 * try {
 *   await supabase.rpc('some_protected_function');
 * } catch (error) {
 *   const capError = parseCapabilityError(error);
 *   if (capError) {
 *     setCapabilityError(capError);
 *     return;
 *   }
 *   // Handle other errors...
 * }
 * ```
 */

export interface CapabilityError {
  capability: string;
  message: string;
}

/**
 * Check if an error is a CAPABILITY_REQUIRED error from CBAC.
 * Returns the parsed capability name if it is, null otherwise.
 */
export function parseCapabilityError(error: unknown): CapabilityError | null {
  if (!error || typeof error !== 'object') return null;
  
  const err = error as { code?: string; message?: string };
  
  // Check for PostgreSQL raise exception code (P0001)
  // and CAPABILITY_REQUIRED prefix in message
  if (err.code === 'P0001' && err.message?.startsWith('CAPABILITY_REQUIRED:')) {
    // Extract capability name from message
    // Format: "CAPABILITY_REQUIRED: purchase_orders is not enabled for this plan"
    const messagePart = err.message.split(': ')[1];
    const capability = messagePart?.split(' ')[0] || 'unknown';
    
    return {
      capability,
      message: err.message,
    };
  }
  
  // Also check for the message format in case code is different
  if (err.message?.startsWith('CAPABILITY_REQUIRED:')) {
    const messagePart = err.message.split(': ')[1];
    const capability = messagePart?.split(' ')[0] || 'unknown';
    
    return {
      capability,
      message: err.message,
    };
  }
  
  return null;
}

/**
 * Check if an error is a capability error (simpler boolean check).
 */
export function isCapabilityError(error: unknown): boolean {
  return parseCapabilityError(error) !== null;
}
