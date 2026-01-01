import { useState } from "react";
import { X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface SupplierFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierFormData) => void;
}

export interface SupplierFormData {
  name: string;
  email: string;
  type: 'consignment' | 'purchase' | 'own';
  commissionRate: number;
  country: string;
  contactName: string;
  phone: string;
  address: string;
}

export function SupplierFormModal({ isOpen, onClose, onSubmit }: SupplierFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<SupplierFormData>({
    name: "",
    email: "",
    type: "purchase",
    commissionRate: 0,
    country: "",
    contactName: "",
    phone: "",
    address: "",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return;
    }
    onSubmit(formData);
    toast({ title: "Succès", description: "Fournisseur créé avec succès" });
    onClose();
    setFormData({
      name: "",
      email: "",
      type: "purchase",
      commissionRate: 0,
      country: "",
      contactName: "",
      phone: "",
      address: "",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-lg mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouveau fournisseur</h2>
              <p className="text-sm text-muted-foreground">Ajouter un fournisseur au catalogue</p>
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
                  value={formData.type === "consignment" ? formData.commissionRate * 100 : 0}
                  onChange={(e) => setFormData({ ...formData, commissionRate: Number(e.target.value) / 100 })}
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
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
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
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              Créer le fournisseur
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
