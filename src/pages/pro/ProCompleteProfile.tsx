import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Building2, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { toast } from "@/hooks/use-toast";
import { useProAuth } from "@/hooks/useProAuth";
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
  phone: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
}

export function ProCompleteProfile() {
  const navigate = useNavigate();
  const { user, refreshCustomer } = useProAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<FormData>({
    country: "FR",
    companyName: "",
    vatNumber: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
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
      state: "",
      vatNumber: "",
    }));
  };

  const handlePhoneChange = (value: string | undefined) => {
    setFormData((prev) => ({ ...prev, phone: value || "" }));
  };

  const handleStateChange = (value: string) => {
    setFormData((prev) => ({ ...prev, state: value }));
  };

  const validateForm = (): string | null => {
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

    if (!user) {
      setError("Vous devez être connecté");
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase.from("customers").insert({
        auth_user_id: user.id,
        email: user.email,
        company_name: formData.companyName,
        vat_number: formData.vatNumber || null,
        first_name: formData.firstName || null,
        last_name: formData.lastName || null,
        phone: formData.phone || null,
        address: formData.address || null,
        address_line_2: formData.addressLine2 || null,
        city: formData.city || null,
        state: formData.state || null,
        postal_code: formData.postalCode || null,
        country: formData.country || null,
        notes: formData.notes
          ? `Profil complété: ${formData.notes}`
          : "Profil complété via portail pro",
        customer_type: "professional",
        approved: false,
        discount_rate: 0,
        payment_terms: 30,
      });

      if (insertError) {
        console.error("Error creating customer:", insertError);
        setError("Erreur lors de la création du profil");
        return;
      }

      // Refresh customer data in context
      await refreshCustomer();

      toast({
        title: "Profil créé !",
        description: "Votre demande est en attente de validation.",
      });

      navigate("/pro/pending");
    } catch (err) {
      console.error("Profile creation error:", err);
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-xl bg-primary flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Complétez votre profil</h1>
          <p className="text-muted-foreground mt-1">
            Pour finaliser votre inscription professionnelle
          </p>
        </div>

        {/* Info banner */}
        <Alert className="mb-6 border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Vos informations d'inscription n'ont pas pu être récupérées. Veuillez compléter votre profil professionnel pour continuer.
          </AlertDescription>
        </Alert>

        {/* Form */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Country */}
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

            {/* Contact info */}
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
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <PhoneInput
                    international
                    defaultCountry={phoneCountry}
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
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
                <Building2 className="w-4 h-4 mr-2" />
              )}
              Enregistrer mon profil
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
