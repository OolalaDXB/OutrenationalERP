import { useState, useMemo } from "react";
import { useNavigate, Navigate, Link, useParams } from "react-router-dom";
import { Loader2, LogIn, AlertCircle, Moon, Sun, ArrowLeft, Mail, RefreshCw, Disc3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProAuth } from "@/hooks/useProAuth";
import { useTheme } from "next-themes";
import { toast } from "@/hooks/use-toast";
import { useTenantContextOptional } from "@/contexts/TenantContext";

type ViewMode = 'login' | 'forgot-password' | 'resend-email';

export function ProLogin() {
  const navigate = useNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const tenant = useTenantContextOptional();
  const { user, customer, isLoading, isProfessional, isApproved, needsProfile, signIn, resetPassword, resendConfirmationEmail } = useProAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('login');

  const { theme, setTheme } = useTheme();

  // Build base path for navigation (tenant-scoped or legacy)
  const basePath = tenantSlug ? `/t/${tenantSlug}/pro` : '/pro';

  // Tenant branding with fallback to Sillon
  const logoUrl = tenant?.settings?.logo_url || null;
  const companyName = tenant?.settings?.company_name || tenant?.name || 'Sillon';

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Already logged in and approved
  if (!isLoading && user && isProfessional && isApproved) {
    return <Navigate to={basePath} replace />;
  }

  // Logged in but needs to complete their profile (no customer record + no localStorage data)
  if (!isLoading && user && !customer && needsProfile) {
    return <Navigate to={`${basePath}/complete-profile`} replace />;
  }

  // Logged in but not approved - redirect to pending page
  if (!isLoading && user && customer && isProfessional && !isApproved) {
    return <Navigate to={`${basePath}/pending`} replace />;
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
      } else if (viewMode === 'resend-email') {
        const { error: resendError } = await resendConfirmationEmail(email);
        if (resendError) {
          if (resendError.message?.includes("already confirmed")) {
            setError("Cet email a déjà été confirmé. Vous pouvez vous connecter.");
          } else {
            setError("Erreur lors de l'envoi de l'email. Vérifiez l'adresse et réessayez.");
          }
        } else {
          setMessage("Un nouvel email de confirmation a été envoyé !");
          toast({
            title: "Email envoyé",
            description: "Vérifiez votre boîte de réception pour confirmer votre compte.",
          });
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          // Check if it's an email confirmation error
          if (signInError.message?.includes("Email not confirmed")) {
            setError("Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.");
          } else {
            setError("Email ou mot de passe incorrect");
          }
          return;
        }
        navigate(basePath);
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
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="h-16 w-16 mx-auto mb-4 object-contain" />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-4">
              <Disc3 className="w-9 h-9 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold">{companyName} Pro</h1>
          <p className="text-muted-foreground mt-1">
            {viewMode === 'forgot-password' 
              ? 'Réinitialisation du mot de passe' 
              : viewMode === 'resend-email'
              ? 'Renvoyer l\'email de confirmation'
              : 'Portail professionnel'}
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
              <div className="p-3 rounded-lg bg-success/10 text-success text-sm">
                {message}
              </div>
            )}

            {/* Email verification reminder */}
            {viewMode === 'login' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                <Mail className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-muted-foreground">
                  <span className="font-medium text-foreground">Email non confirmé ?</span>{" "}
                  <button
                    type="button"
                    onClick={() => switchView('resend-email')}
                    className="text-primary hover:underline"
                  >
                    Renvoyer l'email de confirmation
                  </button>
                </div>
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
              ) : viewMode === 'forgot-password' ? null : viewMode === 'resend-email' ? (
                <RefreshCw className="w-4 h-4 mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {viewMode === 'forgot-password' 
                ? 'Envoyer le lien' 
                : viewMode === 'resend-email'
                ? 'Renvoyer l\'email'
                : 'Se connecter'}
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
          {(viewMode === 'forgot-password' || viewMode === 'resend-email') && (
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
                to={`${basePath}/register`}
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
            © 2026 {companyName}. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground">
            Powered by Sillon
          </p>
        </div>
      </div>
    </div>
  );
}
