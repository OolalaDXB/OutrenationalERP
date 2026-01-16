import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ViesValidationResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name?: string;
  address?: string;
  requestDate: string;
  error?: string;
  serviceUnavailable?: boolean;
}

export function useViesValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ViesValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateVat = useCallback(async (vatNumber: string): Promise<ViesValidationResult | null> => {
    if (!vatNumber || vatNumber.length < 4) {
      setResult(null);
      setError(null);
      return null;
    }

    setIsValidating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('validate-vat', {
        body: { vatNumber },
      });

      if (fnError) {
        setError('Erreur lors de la validation');
        setResult(null);
        return null;
      }

      if (data.error) {
        if (data.serviceUnavailable) {
          setError('Service VIES temporairement indisponible');
        } else {
          setError(data.error);
        }
        setResult(null);
        return null;
      }

      setResult(data as ViesValidationResult);
      return data as ViesValidationResult;
    } catch (err) {
      setError('Erreur de connexion au service VIES');
      setResult(null);
      return null;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    validateVat,
    isValidating,
    result,
    error,
    reset,
  };
}
