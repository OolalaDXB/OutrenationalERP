import { useState } from "react";
import { X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { suppliers } from "@/data/demo-data";

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
}

export interface ProductFormData {
  sku: string;
  title: string;
  artist: string;
  supplierId: string;
  format: 'lp' | '2lp' | 'cd' | 'boxset' | '7inch' | 'cassette';
  sellingPrice: number;
  purchasePrice: number | null;
  description: string;
  stock: number;
  threshold: number;
  location: string;
  status: 'draft' | 'published' | 'archived';
}

export function ProductFormModal({ isOpen, onClose, onSubmit }: ProductFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ProductFormData>({
    sku: "",
    title: "",
    artist: "",
    supplierId: "",
    format: "lp",
    sellingPrice: 0,
    purchasePrice: null,
    description: "",
    stock: 0,
    threshold: 10,
    location: "",
    status: "draft",
  });

  if (!isOpen) return null;

  const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.artist || !formData.supplierId) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires", variant: "destructive" });
      return;
    }
    onSubmit(formData);
    toast({ title: "Succès", description: "Produit créé avec succès" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Nouveau produit</h2>
              <p className="text-sm text-muted-foreground">Ajouter un vinyle au catalogue</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info produit */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Informations produit</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Titre *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="West Virginia Snake Handler Revival"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Artiste *</Label>
                <Input
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  placeholder="Pastor Chris Congregation"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">SKU</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SF130"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Fournisseur *</Label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
                >
                  <option value="">Sélectionner...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Format</Label>
                <select
                  value={formData.format}
                  onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
                >
                  <option value="lp">LP</option>
                  <option value="2lp">2LP</option>
                  <option value="cd">CD</option>
                  <option value="boxset">Boxset</option>
                  <option value="7inch">7"</option>
                  <option value="cassette">Cassette</option>
                </select>
              </div>

              <div className="col-span-2">
                <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du produit..."
                  className="mt-1.5 min-h-[80px]"
                />
              </div>
            </div>
          </div>

          {/* Prix */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Tarification</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Prix de vente *</Label>
                <div className="relative mt-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Prix d'achat {selectedSupplier?.type === "purchase" ? "*" : "(N/A)"}
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchasePrice || 0}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) || null })}
                    disabled={selectedSupplier?.type !== "purchase"}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stock */}
          <div>
            <h3 className="text-sm font-semibold mb-4">Stock</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Quantité</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Seuil d'alerte</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: Number(e.target.value) })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Emplacement</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="A-12"
                  className="mt-1.5"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Statut</Label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
              <option value="archived">Archivé</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              Créer le produit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
