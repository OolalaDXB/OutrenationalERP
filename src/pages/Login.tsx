import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Moon, Sun, ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import logo from '@/assets/outre-national-logo.png';

type ViewMode = 'login' | 'signup' | 'forgot-password';

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (viewMode === 'forgot-password') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Un email de réinitialisation a été envoyé à votre adresse.');
        }
      } else if (viewMode === 'signup') {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Vérifiez votre email pour confirmer votre inscription.');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    setError(null);
    setMessage(null);
  };

  const getTitle = () => {
    switch (viewMode) {
      case 'signup': return 'Créer un compte';
      case 'forgot-password': return 'Mot de passe oublié';
      default: return 'Connexion';
    }
  };

  const getSubtitle = () => {
    switch (viewMode) {
      case 'signup': return 'Entrez vos informations pour vous inscrire';
      case 'forgot-password': return 'Entrez votre email pour recevoir un lien de réinitialisation';
      default: return 'Connectez-vous à votre compte';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      {/* Dark mode toggle */}
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
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={logo} alt="Outre-National" className="h-12 w-12" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Outre-National</h1>
              <p className="text-xs text-muted-foreground">Backoffice</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold">{getTitle()}</h2>
            <p className="text-sm text-muted-foreground mt-1">{getSubtitle()}</p>
          </div>

          {/* Form */}
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

            {viewMode !== 'forgot-password' && (
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
              {viewMode === 'signup' && "S'inscrire"}
              {viewMode === 'login' && 'Se connecter'}
              {viewMode === 'forgot-password' && 'Envoyer le lien'}
            </Button>
          </form>

          {/* Forgot password link (only on login view) */}
          {viewMode === 'login' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => switchView('forgot-password')}
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* Back to login (from forgot password) */}
          {viewMode === 'forgot-password' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-sm text-muted-foreground hover:text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3 h-3" />
                Retour à la connexion
              </button>
            </div>
          )}

          {/* Toggle sign up / sign in */}
          {viewMode !== 'forgot-password' && (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">
                {viewMode === 'signup' ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
              </span>{' '}
              <button
                type="button"
                onClick={() => switchView(viewMode === 'signup' ? 'login' : 'signup')}
                className="text-primary font-medium hover:underline"
              >
                {viewMode === 'signup' ? 'Se connecter' : "S'inscrire"}
              </button>
            </div>
          )}
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
