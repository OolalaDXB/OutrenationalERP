import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Loader2, LogIn, AlertCircle, Moon, Sun, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProAuth } from "@/hooks/useProAuth";
import { useTheme } from "next-themes";
import logo from "@/assets/outre-national-logo.png";

type ViewMode = 'login' | 'forgot-password';

export function ProLogin() {
  const navigate = useNavigate();
  const { user, isLoading, isProfessional, isApproved, signIn, resetPassword } = useProAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('login');

  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Already logged in and approved
  if (!isLoading && user && isProfessional && isApproved) {
    return <Navigate to="/pro" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (viewMode === 'forgot-password') {
        const { error: resetError } = await resetPassword(email);
        if (resetError) {
          setError(resetError.message);
        } else {
          setMessage("Un email de réinitialisation a été envoyé à votre adresse.");
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError("Email ou mot de passe incorrect");
          return;
        }
        navigate("/pro");
      }
    } catch (err) {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    setError("");
    setMessage("");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4 relative">
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
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logo} alt="Outre-National" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Outre-National Pro</h1>
          <p className="text-muted-foreground mt-1">
            {viewMode === 'forgot-password' ? 'Réinitialisation du mot de passe' : 'Portail professionnel'}
          </p>
        </div>

        {/* Login form */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-sm">
                {message}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>

            {viewMode === 'login' && (
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : viewMode === 'forgot-password' ? null : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {viewMode === 'forgot-password' ? 'Envoyer le lien' : 'Se connecter'}
            </Button>
          </form>

          {/* Forgot password link */}
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

          {/* Back to login */}
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

          {viewMode === 'login' && (
            <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
              <p>Pas encore de compte professionnel ?</p>
              <Link 
                to="/pro/register" 
                className="inline-block mt-2 text-primary hover:underline font-medium"
              >
                Créer un compte
              </Link>
            </div>
          )}
        </div>

        {/* Back to main site */}
        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour au site principal
          </Link>
        </div>

        {/* Footer */}
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
