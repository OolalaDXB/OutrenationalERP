import { useState } from "react";
import { Plus, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateSupplier } from "@/hooks/useSuppliers";
import { toast } from "@/hooks/use-toast";

interface InlineSupplierCreatorProps {
  onSupplierCreated: (supplierId: string, supplierName: string) => void;
  onCancel: () => void;
}

export function InlineSupplierCreator({ onSupplierCreated, onCancel }: InlineSupplierCreatorProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"purchase" | "consignment" | "own" | "depot_vente">("purchase");
  const createSupplier = useCreateSupplier();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return;
    }

    try {
      const supplier = await createSupplier.mutateAsync({ name: name.trim(), type });
      toast({ title: "Fournisseur créé", description: `"${name}" a été ajouté` });
      onSupplierCreated(supplier.id, supplier.name);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer le fournisseur", variant: "destructive" });
    }
  };

  return (
    <div className="p-3 border border-primary/30 rounded-lg bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">Nouveau fournisseur</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      
      <div className="space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Nom *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nom du fournisseur"
            className="mt-1 h-8 text-sm"
            autoFocus
          />
        </div>
        
        <div>
          <Label className="text-xs text-muted-foreground">Type</Label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="w-full mt-1 px-2 py-1.5 rounded-md border border-border bg-card text-sm"
          >
            <option value="purchase">Achat</option>
            <option value="consignment">Consignation</option>
            <option value="depot_vente">Dépôt-vente</option>
            <option value="own">Propre</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={createSupplier.isPending || !name.trim()}
          className="flex-1"
        >
          {createSupplier.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 mr-1.5" />
          )}
          Créer
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

interface SupplierSelectorWithCreateProps {
  value: string;
  onChange: (value: string) => void;
  suppliers: { id: string; name: string }[];
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function SupplierSelectorWithCreate({
  value,
  onChange,
  suppliers,
  label = "Fournisseur",
  placeholder = "Sélectionner...",
  required = false,
}: SupplierSelectorWithCreateProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleSupplierCreated = (supplierId: string) => {
    onChange(supplierId);
    setIsCreating(false);
  };

  if (isCreating) {
    return (
      <div>
        {label && (
          <Label className="text-sm font-medium text-muted-foreground">
            {label} {required && "*"}
          </Label>
        )}
        <div className="mt-1.5">
          <InlineSupplierCreator
            onSupplierCreated={handleSupplierCreated}
            onCancel={() => setIsCreating(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {label && (
        <Label className="text-sm font-medium text-muted-foreground">
          {label} {required && "*"}
        </Label>
      )}
      <div className="flex gap-2 mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-sm"
        >
          <option value="">{placeholder}</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsCreating(true)}
          title="Créer un nouveau fournisseur"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
