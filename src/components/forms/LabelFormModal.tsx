import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField, FormSelectField, ValidationErrors, extractZodErrors } from "@/components/ui/form-field";
import { labelSchema, LabelFormValues } from "@/lib/validations/schemas";
import { useCreateLabel, useUpdateLabel, Label as LabelType } from "@/hooks/useLabels";
import { useSuppliers } from "@/hooks/useSuppliers";

interface LabelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  label?: LabelType | null;
  defaultSupplierId?: string;
}

export function LabelFormModal({ isOpen, onClose, label, defaultSupplierId }: LabelFormModalProps) {
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const { data: suppliers = [] } = useSuppliers();
  const isEditing = !!label;

  const [formData, setFormData] = useState({
    name: "",
    country: "",
    website: "",
    discogs_id: "",
    supplier_id: "",
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors<LabelFormValues>>({});

  useEffect(() => {
    if (label) {
      const labelAny = label as any;
      setFormData({
        name: label.name || "",
        country: label.country || "",
        website: label.website || "",
        discogs_id: label.discogs_id || "",
        supplier_id: labelAny.supplier_id || "",
      });
    } else {
      setFormData({
        name: "",
        country: "",
        website: "",
        discogs_id: "",
        supplier_id: defaultSupplierId || "",
      });
    }
    setValidationErrors({});
  }, [label, isOpen, defaultSupplierId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToValidate = {
      name: formData.name.trim(),
      country: formData.country.trim() || undefined,
      website: formData.website.trim() || undefined,
      discogs_id: formData.discogs_id.trim() || undefined,
      supplier_id: formData.supplier_id || undefined,
    };

    const result = labelSchema.safeParse(dataToValidate);
    
    if (!result.success) {
      setValidationErrors(extractZodErrors<LabelFormValues>(result.error));
      return;
    }

    setValidationErrors({});
    
    try {
      if (isEditing && label) {
        await updateLabel.mutateAsync({
          id: label.id,
          name: formData.name,
          country: formData.country || null,
          website: formData.website || null,
          discogs_id: formData.discogs_id || null,
          supplier_id: formData.supplier_id || null,
        } as any);
      } else {
        await createLabel.mutateAsync({
          name: formData.name,
          country: formData.country || null,
          website: formData.website || null,
          discogs_id: formData.discogs_id || null,
          supplier_id: formData.supplier_id || null,
        } as any);
      }
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createLabel.isPending || updateLabel.isPending;

  const supplierOptions = suppliers.map((s) => ({ value: s.id, label: s.name }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Modifier le label" : "Ajouter un label"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations du label"
              : "Ajoutez un nouveau label au catalogue"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="name"
            label="Nom"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nom du label"
            error={validationErrors.name}
          />

          <FormField
            id="country"
            label="Pays"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            placeholder="ex: France, UK, USA..."
            error={validationErrors.country}
          />

          <FormField
            id="website"
            label="Site web"
            type="url"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://..."
            error={validationErrors.website}
          />

          <FormField
            id="discogs_id"
            label="ID Discogs"
            value={formData.discogs_id}
            onChange={(e) => setFormData({ ...formData, discogs_id: e.target.value })}
            placeholder="Identifiant Discogs (optionnel)"
            error={validationErrors.discogs_id}
          />

          <FormSelectField
            id="supplier_id"
            label="Fournisseur"
            value={formData.supplier_id}
            onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
            options={supplierOptions}
            placeholder="Aucun fournisseur"
            error={validationErrors.supplier_id}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim()}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
