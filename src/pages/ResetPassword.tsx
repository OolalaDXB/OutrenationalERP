import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Moon, Sun, CheckCircle, XCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import logo from '@/assets/outre-national-logo.png';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);

  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for recovery token (Supabase puts it in the hash)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        // Set the session from the recovery token
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || '',
        });
        
        if (error) {
          setIsValidSession(false);
        } else {
          setIsValidSession(true);
        }
      } else if (session) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Sign out after password reset to force re-login
        await supabase.auth.signOut();
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="absolute top-4 right-4"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
            <div className="flex items-center justify-center gap-3 mb-8">
              <img src={logo} alt="Outre-National" className="h-12 w-12" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Outre-National</h1>
                <p className="text-xs text-muted-foreground">Backoffice</p>
              </div>
            </div>

            <div className="text-center space-y-4">
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h2 className="text-lg font-semibold">Lien invalide ou expiré</h2>
              <p className="text-sm text-muted-foreground">
                Ce lien de réinitialisation n'est plus valide. Veuillez demander un nouveau lien.
              </p>
              <Button onClick={() => navigate('/')} className="w-full mt-4">
                Retour à la connexion
              </Button>
            </div>
          </div>

          <div className="text-center mt-4 space-y-1">
            <p className="text-xs text-muted-foreground">
              © 2026 Outre-National. Tous droits réservés.
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by Sillon
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="absolute top-4 right-4"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
            <div className="flex items-center justify-center gap-3 mb-8">
              <img src={logo} alt="Outre-National" className="h-12 w-12" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Outre-National</h1>
                <p className="text-xs text-muted-foreground">Backoffice</p>
              </div>
            </div>

            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-lg font-semibold">Mot de passe modifié</h2>
              <p className="text-sm text-muted-foreground">
                Votre mot de passe a été réinitialisé avec succès. Vous allez être redirigé vers la page de connexion...
              </p>
            </div>
          </div>

          <div className="text-center mt-4 space-y-1">
            <p className="text-xs text-muted-foreground">
              © 2026 Outre-National. Tous droits réservés.
            </p>
            <p className="text-xs text-muted-foreground">
              Powered by Sillon
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute top-4 right-4"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>

      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={logo} alt="Outre-National" className="h-12 w-12" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Outre-National</h1>
              <p className="text-xs text-muted-foreground">Backoffice</p>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold">Nouveau mot de passe</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Entrez votre nouveau mot de passe
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Réinitialiser le mot de passe
            </Button>
          </form>
        </div>

        <div className="text-center mt-4 space-y-1">
          <p className="text-xs text-muted-foreground">
            © 2026 Outre-National. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by Sillon
          </p>
        </div>
      </div>
    </div>
  );
}
