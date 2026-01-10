import { useState, useEffect } from "react";
import { X, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useCreateSupplier, useUpdateSupplier, type Supplier, type SupplierInsert } from "@/hooks/useSuppliers";
import type { Enums } from "@/integrations/supabase/types";

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: Supplier | null; // For edit mode
}

export function SupplierFormModal({ isOpen, onClose, supplier }: SupplierFormProps) {
  const { toast } = useToast();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  
  const isEditMode = !!supplier;

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    type: Enums<'supplier_type'>;
    commission_rate: number;
    country: string;
    contact_name: string;
    phone: string;
    address: string;
  }>({
    name: "",
    email: "",
    type: "purchase",
    commission_rate: 0,
    country: "",
    contact_name: "",
    phone: "",
    address: "",
  });

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
      });
    }
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const isLoading = createSupplier.isPending || updateSupplier.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return;
    }

    try {
      const supplierData: SupplierInsert = {
        name: formData.name,
        email: formData.email || null,
        type: formData.type,
        commission_rate: formData.type === "consignment" ? formData.commission_rate : null,
        country: formData.country || null,
        contact_name: formData.contact_name || null,
        phone: formData.phone || null,
        address: formData.address || null,
        active: true,
      };

      if (isEditMode && supplier) {
        await updateSupplier.mutateAsync({ id: supplier.id, ...supplierData });
        toast({ title: "Succès", description: "Fournisseur mis à jour avec succès" });
      } else {
        await createSupplier.mutateAsync(supplierData);
        toast({ title: "Succès", description: "Fournisseur créé avec succès" });
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
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-lg mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-sm font-medium text-muted-foreground">Nom *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Sublime Frequencies"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Type de contrat *</Label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
              >
                <option value="purchase">Achat ferme</option>
                <option value="consignment">Dépôt-vente</option>
                <option value="own">Production propre</option>
              </select>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Commission {formData.type === "consignment" ? "*" : "(N/A)"}
              </Label>
              <div className="relative mt-1.5">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={formData.type === "consignment" ? formData.commission_rate * 100 : 0}
                  onChange={(e) => setFormData({ ...formData, commission_rate: Number(e.target.value) / 100 })}
                  disabled={formData.type !== "consignment"}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@example.com"
                className="mt-1.5"
              />
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

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Contact</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Nom du contact"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">Pays</Label>
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="USA"
                className="mt-1.5"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-sm font-medium text-muted-foreground">Adresse</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Adresse complète"
                className="mt-1.5"
              />
            </div>
          </div>

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
