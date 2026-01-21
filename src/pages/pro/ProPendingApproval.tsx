import { Link } from "react-router-dom";
import { Clock, LogOut, Mail, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProAuth } from "@/hooks/useProAuth";
import logo from "@/assets/outre-national-logo.png";

export function ProPendingApproval() {
  const { customer, signOut } = useProAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={logo} alt="Outre-National" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Outre-National Pro</h1>
        </div>

        {/* Pending approval card */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning/20 flex items-center justify-center mb-6">
            <Clock className="w-8 h-8 text-warning" />
          </div>

          <h2 className="text-xl font-semibold mb-2">Compte en attente de validation</h2>
          
          <p className="text-muted-foreground mb-6">
            Votre demande d'inscription a bien été enregistrée. Notre équipe examine actuellement votre dossier.
          </p>

          {/* Account info */}
          {customer && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{customer.company_name || 'Entreprise'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{customer.email}</span>
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm text-muted-foreground mb-6">
            <p className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              Délai de traitement : 24-48h ouvrées
            </p>
            <p>
              Vous recevrez un email dès que votre compte sera activé.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Se déconnecter
            </Button>
          </div>
        </div>

        {/* Contact info */}
        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            Une question ? Contactez-nous à{" "}
            <a href="mailto:pro@outre-national.com" className="text-primary hover:underline">
              pro@outre-national.com
            </a>
          </p>
          <Link to="/pro/login" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à la connexion
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
