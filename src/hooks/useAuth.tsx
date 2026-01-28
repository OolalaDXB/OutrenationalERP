import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { clearSession, supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AppRole = 'admin' | 'staff' | 'viewer';

interface AuthUser extends User {
  role?: AppRole;
  isProCustomer?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshRole: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  canWrite: () => boolean;
  canDelete: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserRole(userId: string): Promise<AppRole> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching role:', error);
      return 'viewer';
    }
    
    return (data?.role as AppRole) || 'viewer';
  } catch (err) {
    console.error('Exception fetching role:', err);
    return 'viewer';
  }
}

async function checkIsProCustomer(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error checking pro customer:', error);
      return false;
    }
    
    return !!data;
  } catch (err) {
    console.error('Exception checking pro customer:', err);
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    mountedRef.current = true;

    const forceReLogin = async (reason?: string) => {
      try {
        console.warn('Forcing re-login:', reason);
        // Clear all local auth artifacts (handles corrupted/invalid refresh token)
        await clearSession();
      } finally {
        queryClient.clear();
        setSession(null);
        setUser(null);
        setLoading(false);

        const path = window.location.pathname;
        // Avoid redirect loops on auth pages
        const isAuthPage =
          path === '/login' ||
          path === '/request-access' ||
          path === '/reset-password' ||
          path.startsWith('/t/') || // tenant router will handle login redirects
          path.startsWith('/pro');

        if (!isAuthPage) {
          window.location.replace('/login');
        }
      }
    };

    // Set up auth state listener - this is the SINGLE source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mountedRef.current) return;

        console.log('Auth state change:', event, newSession?.user?.email);

        // Handle token refresh failures or corrupted sessions
        if ((event as any) === 'TOKEN_REFRESH_FAILED') {
          await forceReLogin('TOKEN_REFRESH_FAILED');
          return;
        }

        if (event === 'TOKEN_REFRESHED' && !newSession) {
          await forceReLogin('TOKEN_REFRESHED_WITHOUT_SESSION');
          return;
        }

        if (event === 'SIGNED_OUT') {
          // Clear all React Query cache on sign out to prevent stale data
          queryClient.clear();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(newSession);

        if (newSession?.user) {
          // Fetch role and check if pro customer in a non-blocking way
          setTimeout(async () => {
            if (!mountedRef.current) return;
            
            const role = await fetchUserRole(newSession.user.id);
            
            // SECURITY: If user has NO ERP role (viewer is the default/fallback),
            // check if they're a Pro customer and block them
            const hasErpRole = role === 'admin' || role === 'staff';
            
            if (!hasErpRole) {
              // Only check for Pro customer if they don't have an explicit ERP role
              const isProCustomer = await checkIsProCustomer(newSession.user.id);
              
              if (isProCustomer) {
                console.warn('Pro customer attempted to access ERP backoffice');
                toast.error('Accès réservé au personnel', {
                  description: 'Utilisez le portail Pro pour accéder à votre espace client.',
                });
                await supabase.auth.signOut();
                window.location.href = '/pro/login';
                return;
              }
            }
            
            if (mountedRef.current) {
              setUser({
                ...newSession.user,
                role,
                isProCustomer: false
              });
              setLoading(false);
            }
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Trigger initial session check - the listener above will handle the result
    // Only do this once
     if (!initializedRef.current) {
      initializedRef.current = true;
      supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.error('Error getting initial session:', error);
           const msg = String((error as any)?.message || error);
           // Most common cause of "loading then nothing": invalid refresh token stuck in storage
           if (msg.toLowerCase().includes('refresh_token_not_found') || msg.toLowerCase().includes('invalid refresh token')) {
             void forceReLogin('INVALID_REFRESH_TOKEN');
             return;
           }
           if (mountedRef.current) setLoading(false);
        }
        // If no session and listener hasn't fired yet, set loading to false
        if (!initialSession && mountedRef.current) {
          // Small delay to let listener potentially fire first
          setTimeout(() => {
            if (mountedRef.current && loading) {
              setLoading(false);
            }
          }, 100);
        }
      });
    }

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    try {
      // Clear local state first to ensure UI updates immediately
      setSession(null);
      setUser(null);
      queryClient.clear();
      
      // Then attempt to sign out from Supabase (may fail if session already expired)
      const { error } = await supabase.auth.signOut();
      
      // Ignore "session_not_found" errors - session is already gone server-side
      if (error && !error.message?.includes('session_not_found') && error.message !== 'Session not found') {
        console.error('Error signing out:', error);
      }
    } catch (err) {
      console.error('Exception signing out:', err);
      // Local state already cleared above, so user is effectively logged out
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error as Error | null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const refreshRole = async () => {
    if (user) {
      const role = await fetchUserRole(user.id);
      setUser(prev => prev ? { ...prev, role } : null);
      console.log('Role refreshed:', role);
    }
  };

  const hasRole = (role: AppRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: AppRole[]): boolean => {
    return user?.role ? roles.includes(user.role) : false;
  };

  const canWrite = (): boolean => {
    return hasAnyRole(['admin', 'staff']);
  };

  const canDelete = (): boolean => {
    return hasRole('admin');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signIn, 
      signUp, 
      signOut,
      resetPassword,
      refreshRole,
      hasRole,
      hasAnyRole,
      canWrite,
      canDelete
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
