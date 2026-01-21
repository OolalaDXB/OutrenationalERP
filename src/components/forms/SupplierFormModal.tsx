import { useState, useEffect } from "react";
import { X, Building2, Loader2, Info, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useCreateSupplier, useUpdateSupplier, type Supplier, type SupplierInsert } from "@/hooks/useSuppliers";
import { useLabels } from "@/hooks/useLabels";
import { useSupplierLabels, useSaveSupplierLabels } from "@/hooks/useSupplierLabels";
import { useViesValidation, type ViesValidationResult } from "@/hooks/useViesValidation";
import type { Enums } from "@/integrations/supabase/types";
import {
  requiresState,
  isValidVatNumberFormat,
  US_STATES,
  CANADIAN_PROVINCES,
  UAE_EMIRATES,
  EU_COUNTRIES,
} from "@/lib/vat-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supplierSchema } from "@/lib/validations/schemas";

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: Supplier | null; // For edit mode
}

export function SupplierFormModal({ isOpen, onClose, supplier }: SupplierFormProps) {
  const { toast } = useToast();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const { data: labels = [] } = useLabels();
  const { data: supplierLabels = [] } = useSupplierLabels(supplier?.id ?? null);
  const saveSupplierLabels = useSaveSupplierLabels();
  const { validateVat, isValidating, result: viesResult, error: viesError, reset: resetVies } = useViesValidation();
  
  const isEditMode = !!supplier;
  
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    type: Enums<'supplier_type'>;
    commission_rate: number;
    country: string;
    contact_name: string;
    phone: string;
    address: string;
    city: string;
    postal_code: string;
    state: string;
    vat_number: string;
    website: string;
  }>({
    name: "",
    email: "",
    type: "purchase",
    commission_rate: 0,
    country: "",
    contact_name: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    state: "",
    vat_number: "",
    website: "",
  });

  const [vatValidationStatus, setVatValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const showStateField = requiresState(formData.country);
  const hasValidVatFormat = isValidVatNumberFormat(formData.vat_number);
  
  // Check if country is in EU (VIES validation available)
  const isEuCountry = EU_COUNTRIES.some(eu => 
    formData.country.toLowerCase().includes(eu.toLowerCase()) ||
    formData.vat_number.substring(0, 2).toUpperCase() === eu.substring(0, 2).toUpperCase()
  );

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

  // Populate form when editing
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || "",
        email: supplier.email || "",
        type: supplier.type || "purchase",
        commission_rate: supplier.commission_rate || 0,
        country: supplier.country || "",
        contact_name: supplier.contact_name || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        city: supplier.city || "",
        postal_code: supplier.postal_code || "",
        state: (supplier as any).state || "",
        vat_number: (supplier as any).vat_number || "",
        website: supplier.website || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        type: "purchase",
        commission_rate: 0,
        country: "",
        contact_name: "",
        phone: "",
        address: "",
        city: "",
        postal_code: "",
        state: "",
        vat_number: "",
        website: "",
      });
      setSelectedLabelIds([]);
    }
  }, [supplier, isOpen]);

  // Load existing supplier labels when editing
  useEffect(() => {
    if (supplierLabels.length > 0) {
      setSelectedLabelIds(supplierLabels.map(sl => sl.label_id));
    }
  }, [supplierLabels]);

  // Reset state when country changes
  useEffect(() => {
    if (!requiresState(formData.country)) {
      setFormData(prev => ({ ...prev, state: "" }));
    }
  }, [formData.country]);

  if (!isOpen) return null;

  const isLoading = createSupplier.isPending || updateSupplier.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate with Zod schema
    const result = supplierSchema.safeParse(formData);
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
      const supplierData: SupplierInsert = {
        name: formData.name,
        email: formData.email || null,
        type: formData.type,
        commission_rate: (formData.type === "consignment" || formData.type === "depot_vente") ? formData.commission_rate : null,
        country: formData.country || null,
        contact_name: formData.contact_name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        city: formData.city || null,
        postal_code: formData.postal_code || null,
        website: formData.website || null,
        active: true,
      };

      // Add new fields (they may not be in types yet, so we cast)
      const extendedData = {
        ...supplierData,
        state: formData.state || null,
        vat_number: formData.vat_number || null,
      } as SupplierInsert;

      let supplierId: string;

      if (isEditMode && supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, ...extendedData });
        supplierId = supplier.id;
        toast({ title: "Succès", description: "Fournisseur mis à jour avec succès" });
      } else {
        const newSupplier = await createSupplier.mutateAsync(extendedData);
        supplierId = newSupplier.id;
        toast({ title: "Succès", description: "Fournisseur créé avec succès" });
      }

      // Save supplier labels
      await saveSupplierLabels.mutateAsync({ 
        supplierId, 
        labelIds: selectedLabelIds 
      });

      onClose();
    } catch (error) {
      toast({ 
        title: "Erreur", 
        description: error instanceof Error ? error.message : "Une erreur est survenue", 
        variant: "destructive" 
      });
    }
  };

  const handleLabelToggle = (labelId: string) => {
    setSelectedLabelIds(prev => 
      prev.includes(labelId) 
        ? prev.filter(id => id !== labelId)
        : [...prev, labelId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-2xl mx-4 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{isEditMode ? "Modifier le fournisseur" : "Nouveau fournisseur"}</h2>
              <p className="text-sm text-muted-foreground">{isEditMode ? "Modifier les informations" : "Ajouter un fournisseur"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Informations générales</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Nom *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (validationErrors.name) setValidationErrors(prev => ({ ...prev, name: "" }));
                  }}
                  placeholder="Sublime Frequencies"
                  className={`mt-1.5 ${validationErrors.name ? 'border-destructive' : ''}`}
                />
                {validationErrors.name && (
                  <p className="text-xs text-destructive mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Type de contrat *</Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
                >
                  <option value="purchase">Achat ferme</option>
                  <option value="own">Production propre</option>
                  <option value="depot_vente">Dépôt-vente</option>
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Commission {(formData.type === "consignment" || formData.type === "depot_vente") ? "*" : "(N/A)"}
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={(formData.type === "consignment" || formData.type === "depot_vente") ? formData.commission_rate * 100 : 0}
                    onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) / 100 })}
                    disabled={formData.type !== "consignment" && formData.type !== "depot_vente"}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
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
                        <p>Format: Code pays (2 lettres) + numéro</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Ex: FR12345678901, DE123456789
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={formData.vat_number}
                    onChange={(e) => {
                      setFormData({ ...formData, vat_number: e.target.value.toUpperCase() });
                      setVatValidationStatus('idle');
                      resetVies();
                    }}
                    placeholder="FR12345678901"
                    className="flex-1"
                  />
                  {hasValidVatFormat && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const result = await validateVat(formData.vat_number);
                        if (result) {
                          setVatValidationStatus(result.valid ? 'valid' : 'invalid');
                          if (result.valid && result.name) {
                            toast({
                              title: result.cached ? "TVA validée (cache)" : "TVA validée",
                              description: `Entreprise: ${result.name}`,
                            });
                          }
                        }
                      }}
                      disabled={isValidating}
                      className="shrink-0"
                    >
                      {isValidating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      <span className="ml-1">Vérifier</span>
                    </Button>
                  )}
                </div>
                
                {/* Format validation */}
                {formData.vat_number && (
                  <p className={`text-xs mt-1 ${hasValidVatFormat ? 'text-green-600' : 'text-amber-600'}`}>
                    {hasValidVatFormat ? '✓ Format valide' : '⚠ Format invalide'}
                  </p>
                )}
                
                {/* VIES validation result */}
                {viesResult && (
                  <div className={`flex items-center gap-2 mt-2 p-2 rounded-lg ${
                    viesResult.valid ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {viesResult.valid ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <div className="text-sm">
                      {viesResult.valid ? (
                        <>
                          <span className="font-medium">TVA valide{viesResult.cached ? ' (cache)' : ''}</span>
                          {viesResult.name && <span className="ml-1">- {viesResult.name}</span>}
                        </>
                      ) : (
                        <span className="font-medium">TVA invalide</span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* VIES error */}
                {viesError && (
                  <p className="text-xs mt-1 text-amber-600">{viesError}</p>
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

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nom du contact</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="John Smith"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: "" }));
                  }}
                  placeholder="contact@example.com"
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
                  placeholder="+33 1 23 45 67 89"
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
                  placeholder="Adresse complète"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Code postal</Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
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

          {/* Labels */}
          {labels.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Labels distribués</h3>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-border rounded-lg">
                {labels.map((label) => (
                  <div key={label.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`label-${label.id}`}
                      checked={selectedLabelIds.includes(label.id)}
                      onCheckedChange={() => handleLabelToggle(label.id)}
                    />
                    <label
                      htmlFor={`label-${label.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {label.name}
                      {label.country && (
                        <span className="text-muted-foreground ml-1">({label.country})</span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
              {selectedLabelIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedLabelIds.length} label(s) sélectionné(s)
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditMode ? "Enregistrer" : "Créer le fournisseur"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
