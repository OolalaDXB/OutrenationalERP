import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface ProCustomer {
  id: string;
  email: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  customer_type: string | null;
  approved: boolean | null;
  discount_rate: number | null;
  vat_number: string | null;
  payment_terms: number | null;
  address: string | null;
  address_line_2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  phone: string | null;
}

interface ProAuthContextType {
  user: User | null;
  customer: ProCustomer | null;
  isLoading: boolean;
  isApproved: boolean;
  isProfessional: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshCustomer: () => Promise<void>;
}

const ProAuthContext = createContext<ProAuthContextType | null>(null);

export function ProAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<ProCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomer = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', userId)
      .single();

    if (error || !data) {
      setCustomer(null);
      return null;
    }

    setCustomer(data as ProCustomer);
    return data as ProCustomer;
  }, []);

  const refreshCustomer = useCallback(async () => {
    if (user) {
      await fetchCustomer(user.id);
    }
  }, [user, fetchCustomer]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(() => fetchCustomer(session.user.id), 0);
        } else {
          setCustomer(null);
        }
        
        setIsLoading(false);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCustomer(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchCustomer]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCustomer(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/pro/reset-password`,
    });
    return { error: error as Error | null };
  };

  const isApproved = customer?.approved === true;
  const isProfessional = customer?.customer_type === 'professional';

  return (
    <ProAuthContext.Provider value={{
      user,
      customer,
      isLoading,
      isApproved,
      isProfessional,
      signIn,
      signOut,
      resetPassword,
      refreshCustomer
    }}>
      {children}
    </ProAuthContext.Provider>
  );
}

export function useProAuth() {
  const context = useContext(ProAuthContext);
  if (!context) {
    throw new Error('useProAuth must be used within a ProAuthProvider');
  }
  return context;
}
