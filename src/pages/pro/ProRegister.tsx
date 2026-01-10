import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function ProRegister() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    vatNumber: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    country: "France",
    notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (formData.password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (!formData.companyName.trim()) {
      setError("Le nom de l'entreprise est requis");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: window.location.origin + "/pro/login"
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("Cet email est déjà utilisé");
        } else {
          setError("Erreur lors de la création du compte");
        }
        return;
      }

      if (!authData.user) {
        setError("Erreur lors de la création du compte");
        return;
      }

      // 2. Create customer record (unapproved professional)
      const { error: customerError } = await supabase
        .from("customers")
        .insert({
          auth_user_id: authData.user.id,
          email: formData.email,
          company_name: formData.companyName,
          vat_number: formData.vatNumber || null,
          first_name: formData.firstName || null,
          last_name: formData.lastName || null,
          phone: formData.phone || null,
          address: formData.address || null,
          address_line_2: formData.addressLine2 || null,
          city: formData.city || null,
          postal_code: formData.postalCode || null,
          country: formData.country || null,
          notes: formData.notes ? `Demande d'inscription: ${formData.notes}` : "Demande d'inscription via portail pro",
          customer_type: "professional",
          approved: false,
          discount_rate: 0,
          payment_terms: 30
        });

      if (customerError) {
        console.error("Customer creation error:", customerError);
        // Sign out the user if customer creation fails
        await supabase.auth.signOut();
        setError("Erreur lors de la création du profil client");
        return;
      }

      setIsSuccess(true);
      toast({
        title: "Demande envoyée !",
        description: "Votre demande d'inscription a été enregistrée."
      });

    } catch (err) {
      console.error("Registration error:", err);
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-success/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Demande envoyée !</h1>
          <p className="text-muted-foreground mb-6">
            Votre demande d'inscription a été enregistrée. Notre équipe va examiner votre dossier et vous contactera sous 24-48h.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Vérifiez votre boîte mail pour confirmer votre adresse email.
          </p>
          <Link to="/pro/login">
            <Button>Retour à la connexion</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-xl bg-primary flex items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-2xl">ON</span>
          </div>
          <h1 className="text-2xl font-bold">Outre-National Pro</h1>
          <p className="text-muted-foreground mt-1">Demande de compte professionnel</p>
        </div>

        {/* Registration form */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Company info */}
            <div>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border">
                Informations entreprise
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="companyName">Raison sociale *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Nom de votre entreprise"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vatNumber">N° TVA intracommunautaire</Label>
                  <Input
                    id="vatNumber"
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleChange}
                    placeholder="FR12345678901"
                  />
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border">
                Contact
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Jean"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Dupont"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="contact@entreprise.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+33 1 23 45 67 89"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border">
                Adresse
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 rue du Commerce"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="addressLine2">Complément d'adresse</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                    placeholder="Bâtiment A, 2ème étage"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    placeholder="75001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Paris"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="France"
                  />
                </div>
              </div>
            </div>

            {/* Account */}
            <div>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border">
                Compte
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe *</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Message (optionnel)</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Présentez votre activité, vos besoins..."
                rows={3}
              />
            </div>

            {/* Submit */}
            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Envoyer ma demande
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              En soumettant ce formulaire, vous acceptez nos conditions générales de vente professionnelles.
            </p>
          </form>
        </div>

        {/* Back to login */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to="/pro/login" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
