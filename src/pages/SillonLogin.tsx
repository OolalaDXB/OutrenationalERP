import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Disc3, ArrowLeft, Building2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

interface UserTenant {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  role: string;
}

type ViewMode = 'login' | 'forgot-password' | 'select-tenant';

export function SillonLogin() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // User already logged in, check their tenants
        await handlePostLogin();
      }
      setIsCheckingSession(false);
    };
    checkSession();
  }, []);

  const fetchUserTenants = async (): Promise<UserTenant[]> => {
    const { data, error } = await supabase.rpc('get_user_tenants') as { 
      data: UserTenant[] | null; 
      error: any;
    };
    if (error) {
      console.error('Failed to fetch tenants:', error);
      return [];
    }
    return data || [];
  };

  const handlePostLogin = async () => {
    const tenants = await fetchUserTenants();
    
    if (tenants.length === 0) {
      setError('Aucun accès configuré pour ce compte. Contactez votre administrateur.');
      await supabase.auth.signOut();
      setIsLoading(false);
      return;
    }
    
    if (tenants.length === 1) {
      // Single tenant - redirect directly
      navigate(`/t/${tenants[0].tenant_slug}/`, { replace: true });
    } else {
      // Multiple tenants - show selector
      setUserTenants(tenants);
      setViewMode('select-tenant');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (viewMode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          setError(error.message);
        } else {
          setMessage('Un email de réinitialisation a été envoyé à votre adresse.');
        }
        setIsLoading(false);
        return;
      }

      // Login
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      await handlePostLogin();
    } catch (err) {
      setError('Une erreur est survenue');
      setIsLoading(false);
    }
  };

  const handleTenantSelect = (tenant: UserTenant) => {
    navigate(`/t/${tenant.tenant_slug}/`, { replace: true });
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-background p-4 relative">
      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow">
              <Disc3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Sillon</h1>
              <p className="text-xs text-muted-foreground">Backoffice</p>
            </div>
          </div>

          {/* Tenant selector view */}
          {viewMode === 'select-tenant' && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold">Choisir un espace</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Vous avez accès à plusieurs organisations
                </p>
              </div>
              <div className="space-y-3">
                {userTenants.map((tenant) => (
                  <button
                    key={tenant.tenant_id}
                    onClick={() => handleTenantSelect(tenant)}
                    className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">{tenant.tenant_name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{tenant.role}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setViewMode('login');
                    setUserTenants([]);
                  }}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  Se déconnecter
                </button>
              </div>
            </>
          )}

          {/* Login / Forgot password views */}
          {viewMode !== 'select-tenant' && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold">
                  {viewMode === 'forgot-password' ? 'Mot de passe oublié' : 'Connexion'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {viewMode === 'forgot-password' 
                    ? 'Entrez votre email pour recevoir un lien de réinitialisation'
                    : 'Connectez-vous à votre espace de travail'
                  }
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {viewMode === 'login' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
                    {message}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {viewMode === 'login' ? 'Se connecter' : 'Envoyer le lien'}
                </Button>
              </form>

              {viewMode === 'login' && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot-password');
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {viewMode === 'forgot-password' && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('login');
                      setError(null);
                      setMessage(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Retour à la connexion
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center mt-4 space-y-1">
          <p className="text-xs text-muted-foreground">
            © 2026 Sillon. Powered by Oolala.
          </p>
        </div>
      </div>
    </div>
  );
}
