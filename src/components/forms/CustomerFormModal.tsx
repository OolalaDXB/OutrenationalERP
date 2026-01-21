import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, UserCircle, Building2, Info, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateCustomer, useUpdateCustomer, type Customer } from "@/hooks/useCustomers";
import { useViesValidation } from "@/hooks/useViesValidation";
import { 
  requiresState, 
  getVatZone, 
  getVatStatusLabel, 
  isValidVatNumberFormat,
  US_STATES,
  CANADIAN_PROVINCES,
  UAE_EMIRATES,
  type CustomerType
} from "@/lib/vat-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { customerSchema, type CustomerFormValues } from "@/lib/validations/schemas";

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null; // For edit mode
}

export interface CustomerFormData {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  address: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  state: string;
  country: string;
  customerType: CustomerType;
  vatNumber: string;
  website: string;
}

export function CustomerFormModal({ isOpen, onClose, customer }: CustomerFormProps) {
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const { validateVat, isValidating: isValidatingVat, result: viesResult, error: viesError, reset: resetVies } = useViesValidation();
  
  const isEditMode = !!customer;

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CustomerFormData>({
    email: "",
    firstName: "",
    lastName: "",
    companyName: "",
    phone: "",
    address: "",
    addressLine2: "",
    city: "",
    postalCode: "",
    state: "",
    country: "France",
    customerType: "particulier",
    vatNumber: "",
    website: "",
  });

  // Populate form when editing
  useEffect(() => {
    if (customer) {
      setFormData({
        email: customer.email || "",
        firstName: customer.first_name || "",
        lastName: customer.last_name || "",
        companyName: customer.company_name || "",
        phone: customer.phone || "",
        address: customer.address || "",
        addressLine2: customer.address_line_2 || "",
        city: customer.city || "",
        postalCode: customer.postal_code || "",
        state: (customer as any).state || "",
        country: customer.country || "France",
        customerType: (customer.customer_type as CustomerType) || "particulier",
        vatNumber: customer.vat_number || "",
        website: (customer as any).website || "",
      });
      resetVies();
    } else {
      setFormData({
        email: "",
        firstName: "",
        lastName: "",
        companyName: "",
        phone: "",
        address: "",
        addressLine2: "",
        city: "",
        postalCode: "",
        state: "",
        country: "France",
        customerType: "particulier",
        vatNumber: "",
        website: "",
      });
      resetVies();
    }
  }, [customer, isOpen, resetVies]);

  const showStateField = requiresState(formData.country);
  const vatZone = getVatZone(formData.country);
  const hasValidVatFormat = isValidVatNumberFormat(formData.vatNumber);
  const isVatVerified = viesResult?.valid === true;
  const vatStatus = getVatStatusLabel(formData.country, formData.customerType, isVatVerified || hasValidVatFormat);
  const showVatField = formData.customerType === 'professionnel';
  const showCompanyFields = formData.customerType === 'professionnel';
  const isLoading = createCustomer.isPending || updateCustomer.isPending;

  // Get states/provinces based on country
  const getStateOptions = () => {
    const normalizedCountry = formData.country.toLowerCase().trim();
    if (normalizedCountry.includes('états-unis') || normalizedCountry === 'usa' || normalizedCountry === 'united states') {
      return US_STATES;
    }
    if (normalizedCountry === 'canada') {
      return CANADIAN_PROVINCES;
    }
    if (normalizedCountry.includes('émirats') || normalizedCountry === 'uae' || normalizedCountry.includes('united arab emirates')) {
      return UAE_EMIRATES;
    }
    return [];
  };

  const stateOptions = getStateOptions();

  // Reset state when country changes
  useEffect(() => {
    if (!requiresState(formData.country)) {
      setFormData(prev => ({ ...prev, state: "" }));
    }
  }, [formData.country]);

  // Validate VAT when it changes and has valid format
  const handleVatValidation = useCallback(async () => {
    if (hasValidVatFormat && formData.vatNumber.length >= 4) {
      await validateVat(formData.vatNumber);
    }
  }, [formData.vatNumber, hasValidVatFormat, validateVat]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod schema
    const result = customerSchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setValidationErrors(errors);
      toast({ title: "Erreur de validation", description: "Veuillez corriger les champs en erreur", variant: "destructive" });
      return;
    }
    
    setValidationErrors({});

    try {
      const customerData = {
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        company_name: formData.companyName || null,
        phone: formData.phone || null,
        address: formData.address || null,
        address_line_2: formData.addressLine2 || null,
        city: formData.city || null,
        postal_code: formData.postalCode || null,
        state: formData.state || null,
        country: formData.country || null,
        customer_type: formData.customerType,
        vat_number: formData.vatNumber || null,
        website: formData.website || null,
      };

      if (isEditMode && customer) {
        await updateCustomer.mutateAsync({ id: customer.id, ...customerData });
        toast({ title: "Succès", description: "Client mis à jour avec succès" });
      } else {
        await createCustomer.mutateAsync(customerData);
        toast({ title: "Succès", description: "Client créé avec succès" });
      }
      onClose();
    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: error instanceof Error ? error.message : "Une erreur est survenue", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-2xl mx-4 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              {formData.customerType === 'professionnel' ? (
                <Building2 className="w-5 h-5 text-primary" />
              ) : (
                <UserCircle className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{isEditMode ? "Modifier le client" : "Nouveau client"}</h2>
              <p className="text-sm text-muted-foreground">{isEditMode ? "Modifier les informations" : "Ajouter un client"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Type Selection */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Type de client *</Label>
            <div className="flex gap-4 mt-2">
              <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                formData.customerType === 'particulier' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-muted-foreground'
              }`}>
                <input
                  type="radio"
                  name="customerType"
                  value="particulier"
                  checked={formData.customerType === 'particulier'}
                  onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
                  className="sr-only"
                />
                <UserCircle className="w-5 h-5" />
                <span className="font-medium">Particulier</span>
              </label>
              <label className={`flex items-center gap-2 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                formData.customerType === 'professionnel' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-muted-foreground'
              }`}>
                <input
                  type="radio"
                  name="customerType"
                  value="professionnel"
                  checked={formData.customerType === 'professionnel'}
                  onChange={(e) => setFormData({ ...formData, customerType: e.target.value as CustomerType })}
                  className="sr-only"
                />
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Professionnel</span>
              </label>
            </div>
          </div>

          {/* Company Fields (Professional only) */}
          {showCompanyFields && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <h3 className="font-medium text-sm">Informations entreprise</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Nom de l'entreprise *</Label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => {
                      setFormData({ ...formData, companyName: e.target.value });
                      if (validationErrors.companyName) setValidationErrors(prev => ({ ...prev, companyName: "" }));
                    }}
                    placeholder="Acme Records"
                    className={`mt-1.5 ${validationErrors.companyName ? 'border-destructive' : ''}`}
                  />
                  {validationErrors.companyName && (
                    <p className="text-xs text-destructive mt-1">{validationErrors.companyName}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    TVA Intracommunautaire
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Format: Code pays (2 lettres) + numéro (ex: FR12345678901)</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Requis pour l'autoliquidation UE
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      value={formData.vatNumber}
                      onChange={(e) => {
                        setFormData({ ...formData, vatNumber: e.target.value.toUpperCase() });
                        resetVies();
                      }}
                      placeholder="FR12345678901"
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleVatValidation}
                      disabled={!hasValidVatFormat || isValidatingVat}
                      className="shrink-0"
                    >
                      {isValidatingVat ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Vérifier VIES"
                      )}
                    </Button>
                  </div>
                  {/* VAT Validation Status */}
                  {formData.vatNumber && (
                    <div className="mt-2 space-y-1">
                      {!hasValidVatFormat && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Format invalide
                        </p>
                      )}
                      {hasValidVatFormat && !viesResult && !viesError && !isValidatingVat && (
                        <p className="text-xs text-muted-foreground">
                          ✓ Format valide - Cliquez sur "Vérifier VIES" pour valider
                        </p>
                      )}
                      {viesError && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {viesError}
                        </p>
                      )}
                      {viesResult?.valid === true && (
                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-700 dark:text-green-300">
                          <div className="flex items-center gap-1 font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Numéro de TVA valide
                          </div>
                          {viesResult.name && (
                            <div className="mt-1">Entreprise: {viesResult.name}</div>
                          )}
                          {viesResult.address && (
                            <div className="mt-0.5 text-green-600 dark:text-green-400">{viesResult.address}</div>
                          )}
                        </div>
                      )}
                      {viesResult?.valid === false && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Numéro de TVA non valide dans VIES
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Site web</Label>
                  <Input
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                    className="mt-1.5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Prénom *</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (validationErrors.firstName) setValidationErrors(prev => ({ ...prev, firstName: "" }));
                  }}
                  placeholder="Jean"
                  className={`mt-1.5 ${validationErrors.firstName ? 'border-destructive' : ''}`}
                />
                {validationErrors.firstName && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.firstName}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nom *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (validationErrors.lastName) setValidationErrors(prev => ({ ...prev, lastName: "" }));
                  }}
                  placeholder="Dupont"
                  className={`mt-1.5 ${validationErrors.lastName ? 'border-destructive' : ''}`}
                />
                {validationErrors.lastName && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.lastName}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: "" }));
                  }}
                  placeholder="jean.dupont@gmail.com"
                  className={`mt-1.5 ${validationErrors.email ? 'border-destructive' : ''}`}
                />
                {validationErrors.email && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.email}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Téléphone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Adresse</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Adresse</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Rue de la Musique"
                  className="mt-1.5"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Complément d'adresse</Label>
                <Input
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Appartement, étage, etc."
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Code postal</Label>
                <Input
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="75001"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Ville</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Paris"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Pays</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="France"
                  className="mt-1.5"
                />
              </div>

              {showStateField && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    {formData.country.toLowerCase().includes('émirats') || formData.country.toLowerCase() === 'uae' 
                      ? 'Émirat' 
                      : 'État / Province'}
                  </Label>
                  {stateOptions.length > 0 ? (
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
                    >
                      <option value="">Sélectionner...</option>
                      {stateOptions.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="État / Province"
                      className="mt-1.5"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* VAT Status Preview */}
          <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Statut TVA applicable:</span>
            <span className={`text-sm font-medium ${
              vatStatus.includes('0%') ? 'text-green-600' : 'text-foreground'
            }`}>
              {vatStatus}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditMode ? "Enregistrer" : "Créer le client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
