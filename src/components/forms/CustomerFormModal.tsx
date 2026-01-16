import { useState, useEffect } from "react";
import { X, UserCircle, Building2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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

interface CustomerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CustomerFormData) => void;
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

export function CustomerFormModal({ isOpen, onClose, onSubmit }: CustomerFormProps) {
  const { toast } = useToast();
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

  const showStateField = requiresState(formData.country);
  const vatZone = getVatZone(formData.country);
  const hasValidVat = isValidVatNumberFormat(formData.vatNumber);
  const vatStatus = getVatStatusLabel(formData.country, formData.customerType, hasValidVat);
  const showVatField = formData.customerType === 'professionnel';
  const showCompanyFields = formData.customerType === 'professionnel';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires", variant: "destructive" });
      return;
    }
    if (formData.customerType === 'professionnel' && !formData.companyName) {
      toast({ title: "Erreur", description: "Le nom de l'entreprise est requis pour un client professionnel", variant: "destructive" });
      return;
    }
    onSubmit(formData);
    toast({ title: "Succès", description: "Client créé avec succès" });
    onClose();
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
              <h2 className="text-lg font-semibold">Nouveau client</h2>
              <p className="text-sm text-muted-foreground">Ajouter un client</p>
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
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="Acme Records"
                    className="mt-1.5"
                  />
                </div>
                <div>
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
                  <Input
                    value={formData.vatNumber}
                    onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value.toUpperCase() })}
                    placeholder="FR12345678901"
                    className="mt-1.5"
                  />
                  {formData.vatNumber && (
                    <p className={`text-xs mt-1 ${hasValidVat ? 'text-green-600' : 'text-amber-600'}`}>
                      {hasValidVat ? '✓ Format valide' : '⚠ Format invalide'}
                    </p>
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
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Jean"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nom *</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Dupont"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jean.dupont@gmail.com"
                  className="mt-1.5"
                />
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
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              Créer le client
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
