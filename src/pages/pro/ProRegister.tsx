import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, UserPlus, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CountrySelector } from "@/components/forms/CountrySelector";
import {
  requiresState,
  getTaxIdConfig,
  getStateLabel,
  getStateOptions,
  isValidEuVatFormat,
  isEuCountry,
  getDefaultCountryForPhone,
} from "@/lib/country-config";
import PhoneInput, { isValidPhoneNumber, type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface FormData {
  country: string;
  companyName: string;
  vatNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  password: string;
  confirmPassword: string;
  notes: string;
}

export function ProRegister() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<FormData>({
    country: "FR",
    companyName: "",
    vatNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    password: "",
    confirmPassword: "",
    notes: "",
  });

  // Derived state based on country
  const showState = useMemo(() => requiresState(formData.country), [formData.country]);
  const stateLabel = useMemo(() => getStateLabel(formData.country), [formData.country]);
  const stateOptions = useMemo(() => getStateOptions(formData.country), [formData.country]);
  const taxIdConfig = useMemo(() => getTaxIdConfig(formData.country), [formData.country]);
  const phoneCountry = useMemo(
    () => getDefaultCountryForPhone(formData.country) as Country,
    [formData.country]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCountryChange = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      country: code,
      state: "", // Reset state when country changes
      vatNumber: "", // Reset VAT when country changes
    }));
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData((prev) => ({ ...prev, phone: value || "" }));
  };

  const handleStateChange = (value: string) => {
    setFormData((prev) => ({ ...prev, state: value }));
  };

  const validateForm = (): string | null => {
    if (formData.password !== formData.confirmPassword) {
      return "Les mots de passe ne correspondent pas";
    }

    if (formData.password.length < 6) {
      return "Le mot de passe doit contenir au moins 6 caractères";
    }

    if (!formData.companyName.trim()) {
      return "Le nom de l'entreprise est requis";
    }

    if (!formData.country) {
      return "Le pays est requis";
    }

    if (showState && !formData.state) {
      return `${stateLabel} est requis pour ce pays`;
    }

    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      return "Le numéro de téléphone n'est pas valide";
    }

    // Validate EU VAT format if provided
    if (formData.vatNumber && isEuCountry(formData.country)) {
      if (!isValidEuVatFormat(formData.vatNumber)) {
        return "Le format du numéro de TVA n'est pas valide (ex: FR12345678901)";
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }

      // Call Edge Function - it creates both auth user and customer
      const { data, error } = await supabase.functions.invoke('create-pro-customer', {
        body: {
          email: formData.email,
          password: formData.password,
          companyName: formData.companyName,
          vatNumber: formData.vatNumber,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
          country: formData.country,
          notes: formData.notes
        }
      });

      if (error) {
        console.error("Registration error:", error);
        const errMsg = JSON.stringify(error);
        if (errMsg.includes("EMAIL_ALREADY_USED")) {
          setError("Cet email est déjà utilisé");
        } else if (errMsg.includes("PASSWORD_TOO_SHORT")) {
          setError("Le mot de passe doit contenir au moins 6 caractères");
        } else if (errMsg.includes("COMPANY_REQUIRED")) {
          setError("Le nom de l'entreprise est requis");
        } else {
          setError("Erreur lors de la création du compte");
        }
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      console.error("Unexpected error:", err);
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
          <h1 className="text-2xl font-bold mb-2">Compte créé !</h1>
          <p className="text-muted-foreground mb-6">
            Un email de confirmation a été envoyé à votre adresse. Cliquez sur le lien dans l'email pour activer votre compte.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Après confirmation, connectez-vous pour finaliser votre inscription professionnelle.
          </p>
          <Link to="/pro/login">
            <Button>Aller à la connexion</Button>
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

            {/* 1. COUNTRY - First field */}
            <div>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border">Pays</h3>
              <div className="space-y-2">
                <Label htmlFor="country">Pays *</Label>
                <CountrySelector
                  value={formData.country}
                  onChange={handleCountryChange}
                  placeholder="Sélectionner votre pays"
                />
              </div>
            </div>

            {/* 2. Company info */}
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
                {taxIdConfig.show && (
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="vatNumber">{taxIdConfig.label}</Label>
                    <Input
                      id="vatNumber"
                      name="vatNumber"
                      value={formData.vatNumber}
                      onChange={handleChange}
                      placeholder={taxIdConfig.placeholder}
                    />
                    {isEuCountry(formData.country) && (
                      <p className="text-xs text-muted-foreground">
                        Format: 2 lettres du pays + 8 à 12 caractères (ex: FR12345678901)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Contact info */}
            <div>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border">Contact</h3>
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
                  <PhoneInput
                    international
                    defaultCountry={phoneCountry}
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                  />
                  <p className="text-xs text-muted-foreground">Format international (+33...)</p>
                </div>
              </div>
            </div>

            {/* 4. Address */}
            <div>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border">Adresse</h3>
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
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Paris"
                  />
                </div>
                {showState && (
                  <div className="space-y-2">
                    <Label htmlFor="state">{stateLabel} *</Label>
                    {stateOptions.length > 0 ? (
                      <Select value={formData.state} onValueChange={handleStateChange}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Sélectionner ${stateLabel.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {stateOptions.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder={stateLabel}
                        required
                      />
                    )}
                  </div>
                )}
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
              </div>
            </div>

            {/* 5. Account */}
            <div>
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border">Compte</h3>
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

            {/* 6. Notes */}
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
              En soumettant ce formulaire, vous acceptez nos conditions générales de vente
              professionnelles.
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
