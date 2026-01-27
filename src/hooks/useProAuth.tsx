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
  needsProfile: boolean;
  isBackofficeUser: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  refreshCustomer: () => Promise<void>;
}

const ProAuthContext = createContext<ProAuthContextType | null>(null);

export function ProAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [customer, setCustomer] = useState<ProCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [isBackofficeUser, setIsBackofficeUser] = useState(false);

  // Check if user has admin/staff role (backoffice user)
  const checkBackofficeRole = async (userId: string): Promise<boolean> => {
    try {
      // Check tenant_users table (multi-tenant architecture)
      const { data: tenantData } = await supabase
        .from('tenant_users')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (tenantData?.role === 'admin' || tenantData?.role === 'staff') {
        return true;
      }

      // Fallback: check user_roles table (legacy)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      return roleData?.role === 'admin' || roleData?.role === 'staff';
    } catch (error) {
      console.error('Error checking backoffice role:', error);
      return false;
    }
  };

  const fetchCustomer = async (userId: string, userEmail?: string): Promise<ProCustomer | null | 'needs_profile'> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error || !data) {
      // No customer record found - check if there's pending registration data
      const pendingDataStr = localStorage.getItem('pendingProRegistration');
      if (pendingDataStr && userEmail) {
        try {
          const parsedData = JSON.parse(pendingDataStr);
          
          // Check if data is expired (7 days)
          const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
          const isExpired = parsedData.createdAt && (Date.now() - parsedData.createdAt > SEVEN_DAYS_MS);
          
          if (isExpired) {
            console.log('Pending registration data expired, removing');
            localStorage.removeItem('pendingProRegistration');
            return 'needs_profile';
          }
          
          console.log('Creating customer record from pending registration data');
          
          // Remove createdAt before inserting
          const { createdAt, ...customerData } = parsedData;
          
          const { data: newCustomer, error: insertError } = await supabase
            .from('customers')
            .insert({
              auth_user_id: userId,
              email: userEmail,
              ...customerData,
              customer_type: 'professional',
              approved: false,
              discount_rate: 0,
              payment_terms: 30,
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating customer from pending data:', insertError);
            return 'needs_profile';
          }

          // Successfully created customer - remove pending data
          localStorage.removeItem('pendingProRegistration');
          return newCustomer as ProCustomer;
        } catch (parseError) {
          console.error('Error parsing pending registration data:', parseError);
          localStorage.removeItem('pendingProRegistration');
          return 'needs_profile';
        }
      }
      
      // No pending data - user needs to complete their profile
      return 'needs_profile';
    }

    return data as ProCustomer;
  };

  const refreshCustomer = useCallback(async () => {
    if (user) {
      const result = await fetchCustomer(user.id, user.email || undefined);
      if (result === 'needs_profile') {
        setCustomer(null);
        setNeedsProfile(true);
      } else if (result) {
        setCustomer(result);
        setNeedsProfile(false);
      }
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const handleAuthChange = async (session: { user: User } | null) => {
      if (!mounted) return;

      // On sign out, clear state immediately without making DB queries
      if (!session?.user) {
        setUser(null);
        setCustomer(null);
        setNeedsProfile(false);
        setIsBackofficeUser(false);
        if (mounted) setIsLoading(false);
        return;
      }

      setUser(session.user);

      try {
        // Check if user is admin/staff first
        const hasBackofficeRole = await checkBackofficeRole(session.user.id);
        if (!mounted) return;
        setIsBackofficeUser(hasBackofficeRole);

        // Only fetch customer if not a backoffice user
        if (!hasBackofficeRole) {
          const result = await fetchCustomer(session.user.id, session.user.email || undefined);
          if (!mounted) return;
          
          if (result === 'needs_profile') {
            setCustomer(null);
            setNeedsProfile(true);
          } else if (result) {
            setCustomer(result);
            setNeedsProfile(false);
          }
        } else {
          // Backoffice users don't need customer profile
          setCustomer(null);
          setNeedsProfile(false);
        }
      } catch (error) {
        console.error('Error in auth change handler:', error);
        // On error, clear state to prevent stuck states
        if (mounted) {
          setCustomer(null);
          setNeedsProfile(false);
          setIsBackofficeUser(false);
        }
      }

      if (mounted) setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip processing for sign out - state is cleared above
        if (event === 'SIGNED_OUT') {
          if (mounted) {
            setUser(null);
            setCustomer(null);
            setNeedsProfile(false);
            setIsBackofficeUser(false);
            setIsLoading(false);
          }
          return;
        }
        await handleAuthChange(session);
      }
    );

    // Check initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await handleAuthChange(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  const resendConfirmationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/pro/login`,
      },
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
      needsProfile,
      isBackofficeUser,
      signIn,
      signOut,
      resetPassword,
      resendConfirmationEmail,
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
