import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExchangeRates {
  USD_EUR: number;
  EUR_USD: number;
}

interface ExchangeRateState {
  rates: ExchangeRates;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  isFallback: boolean;
}

const DEFAULT_RATES: ExchangeRates = {
  USD_EUR: 0.92,
  EUR_USD: 1.087,
};

const STORAGE_KEY = 'exchange_rates_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export function useExchangeRates() {
  const { toast } = useToast();
  const [state, setState] = useState<ExchangeRateState>({
    rates: DEFAULT_RATES,
    isLoading: false,
    error: null,
    lastUpdated: null,
    isFallback: true,
  });

  // Load cached rates from localStorage
  const loadCachedRates = useCallback(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { rates, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        if (age < CACHE_DURATION) {
          setState(prev => ({
            ...prev,
            rates,
            lastUpdated: new Date(timestamp),
            isFallback: false,
          }));
          return true;
        }
      }
    } catch (e) {
      console.error('Error loading cached rates:', e);
    }
    return false;
  }, []);

  // Save rates to localStorage
  const saveRatesToCache = useCallback((rates: ExchangeRates) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        rates,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.error('Error saving rates to cache:', e);
    }
  }, []);

  // Fetch fresh rates from the edge function
  const fetchRates = useCallback(async (showToast = false) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('exchange-rates');

      if (error) throw error;

      if (data?.success && data?.rates) {
        const newRates = {
          USD_EUR: data.rates.USD_EUR,
          EUR_USD: data.rates.EUR_USD,
        };
        
        setState({
          rates: newRates,
          isLoading: false,
          error: null,
          lastUpdated: new Date(),
          isFallback: false,
        });
        
        saveRatesToCache(newRates);
        
        if (showToast) {
          toast({
            title: "Taux mis à jour",
            description: `1 USD = ${newRates.USD_EUR.toFixed(4)} EUR`,
          });
        }
        
        return newRates;
      } else if (data?.fallback) {
        setState({
          rates: data.rates,
          isLoading: false,
          error: 'Using fallback rates',
          lastUpdated: new Date(),
          isFallback: true,
        });
        return data.rates;
      }
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch rates',
        isFallback: true,
      }));
    }

    return state.rates;
  }, [saveRatesToCache, toast, state.rates]);

  // Convert USD to EUR
  const convertToEUR = useCallback((amountUSD: number, customRate?: number): number => {
    const rate = customRate ?? state.rates.USD_EUR;
    return amountUSD * rate;
  }, [state.rates.USD_EUR]);

  // Convert EUR to USD
  const convertToUSD = useCallback((amountEUR: number, customRate?: number): number => {
    const rate = customRate ?? state.rates.EUR_USD;
    return amountEUR * rate;
  }, [state.rates.EUR_USD]);

  // Initialize on mount
  useEffect(() => {
    const hasCached = loadCachedRates();
    if (!hasCached) {
      fetchRates();
    }
  }, [loadCachedRates, fetchRates]);

  return {
    ...state,
    fetchRates,
    refreshRates: () => fetchRates(true),
    convertToEUR,
    convertToUSD,
    getRate: (from: 'USD' | 'EUR', to: 'USD' | 'EUR') => {
      if (from === to) return 1;
      return from === 'USD' ? state.rates.USD_EUR : state.rates.EUR_USD;
    },
  };
}
