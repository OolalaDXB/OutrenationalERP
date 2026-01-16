import { useState, useEffect } from "react";
import { X, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useCreateProduct, useUpdateProduct, type Product, type ProductInsert } from "@/hooks/useProducts";
import type { Enums } from "@/integrations/supabase/types";
import { ProductImageGallery } from "./ProductImageGallery";

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null; // For edit mode
}

export function ProductFormModal({ isOpen, onClose, product }: ProductFormProps) {
  const { toast } = useToast();
  const { data: suppliers = [] } = useSuppliers();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  
  const isEditMode = !!product;
  
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<{
    sku: string;
    title: string;
    artist_name: string;
    supplier_id: string;
    format: Enums<'product_format'>;
    selling_price: number;
    purchase_price: number | null;
    description: string;
    stock: number;
    stock_threshold: number;
    location: string;
    status: Enums<'product_status'>;
    condition_media: Enums<'vinyl_condition'>;
    condition_sleeve: Enums<'vinyl_condition'>;
    year_released: number | null;
    image_url: string | null;
    image_urls: string[] | null;
  }>({
    sku: "",
    title: "",
    artist_name: "",
    supplier_id: "",
    format: "lp",
    selling_price: 0,
    purchase_price: null,
    description: "",
    stock: 0,
    stock_threshold: 10,
    location: "",
    status: "draft",
    condition_media: "M",
    condition_sleeve: "M",
    year_released: null,
    image_url: null,
    image_urls: null,
  });

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || "",
        title: product.title || "",
        artist_name: product.artist_name || "",
        supplier_id: product.supplier_id || "",
        format: product.format || "lp",
        selling_price: product.selling_price || 0,
        purchase_price: product.purchase_price || null,
        description: product.description || "",
        stock: product.stock || 0,
        stock_threshold: product.stock_threshold || 10,
        location: product.location || "",
        status: product.status || "draft",
        condition_media: product.condition_media || "M",
        condition_sleeve: product.condition_sleeve || "M",
        year_released: product.year_released || null,
        image_url: product.image_url || null,
        image_urls: product.image_urls || null,
      });
      // Set gallery images from product
      const allImages = product.image_urls || [];
      if (product.image_url && !allImages.includes(product.image_url)) {
        allImages.unshift(product.image_url);
      }
      setImageUrls(allImages);
    } else {
      // Reset form for create mode
      setFormData({
        sku: "",
        title: "",
        artist_name: "",
        supplier_id: "",
        format: "lp",
        selling_price: 0,
        purchase_price: null,
        description: "",
        stock: 0,
        stock_threshold: 10,
        location: "",
        status: "draft",
        condition_media: "M",
        condition_sleeve: "M",
        year_released: null,
        image_url: null,
        image_urls: null,
      });
      setImageUrls([]);
    }
  }, [product, isOpen]);

  const handleImagesChange = (newImages: string[]) => {
    setImageUrls(newImages);
    setFormData(prev => ({ 
      ...prev, 
      image_urls: newImages.length > 0 ? newImages : null 
    }));
  };

  const handleMainImageChange = (url: string | null) => {
    setFormData(prev => ({ ...prev, image_url: url }));
  };

  if (!isOpen) return null;

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
  const isLoading = createProduct.isPending || updateProduct.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.supplier_id) {
      toast({ title: "Erreur", description: "Veuillez remplir les champs obligatoires", variant: "destructive" });
      return;
    }

    try {
      const productData: ProductInsert = {
        sku: formData.sku || `SKU-${Date.now()}`,
        title: formData.title,
        artist_name: formData.artist_name || null,
        supplier_id: formData.supplier_id,
        format: formData.format,
        selling_price: formData.selling_price,
        purchase_price: formData.purchase_price,
        description: formData.description || null,
        stock: formData.stock,
        stock_threshold: formData.stock_threshold,
        location: formData.location || null,
        status: formData.status,
        condition_media: formData.condition_media,
        condition_sleeve: formData.condition_sleeve,
        year_released: formData.year_released,
        image_url: formData.image_url,
        image_urls: formData.image_urls,
      };

      if (isEditMode && product) {
        await updateProduct.mutateAsync({ id: product.id, ...productData });
        toast({ title: "Succès", description: "Produit mis à jour avec succès" });
      } else {
        await createProduct.mutateAsync(productData);
        toast({ title: "Succès", description: "Produit créé avec succès" });
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
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-card flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{isEditMode ? "Modifier le produit" : "Nouveau produit"}</h2>
              <p className="text-sm text-muted-foreground">{isEditMode ? "Modifier les informations du produit" : "Ajouter un vinyle au catalogue"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image Gallery */}
          <ProductImageGallery
            images={imageUrls}
            onImagesChange={handleImagesChange}
            mainImage={formData.image_url}
            onMainImageChange={handleMainImageChange}
          />

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
                <Label className="text-sm font-medium text-muted-foreground">Artiste</Label>
                <Input
                  value={formData.artist_name}
                  onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
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
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
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
                  <option value="3lp">3LP</option>
                  <option value="cd">CD</option>
                  <option value="boxset">Boxset</option>
                  <option value="7inch">7"</option>
                  <option value="10inch">10"</option>
                  <option value="12inch">12"</option>
                  <option value="cassette">Cassette</option>
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Année de sortie</Label>
                <Input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.year_released || ""}
                  onChange={(e) => setFormData({ ...formData, year_released: e.target.value ? Number(e.target.value) : null })}
                  placeholder="2024"
                  className="mt-1.5"
                />
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

          {/* État du vinyle */}
          <div>
            <h3 className="text-sm font-semibold mb-4">État du vinyle</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">État média</Label>
                <select
                  value={formData.condition_media}
                  onChange={(e) => setFormData({ ...formData, condition_media: e.target.value as Enums<'vinyl_condition'> })}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
                >
                  <option value="M">Mint (M) - Neuf</option>
                  <option value="NM">Near Mint (NM)</option>
                  <option value="VG+">Very Good+ (VG+)</option>
                  <option value="VG">Very Good (VG)</option>
                  <option value="G+">Good+ (G+)</option>
                  <option value="G">Good (G)</option>
                  <option value="F">Fair (F)</option>
                  <option value="P">Poor (P)</option>
                </select>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">État pochette</Label>
                <select
                  value={formData.condition_sleeve}
                  onChange={(e) => setFormData({ ...formData, condition_sleeve: e.target.value as Enums<'vinyl_condition'> })}
                  className="w-full mt-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm"
                >
                  <option value="M">Mint (M) - Neuf</option>
                  <option value="NM">Near Mint (NM)</option>
                  <option value="VG+">Very Good+ (VG+)</option>
                  <option value="VG">Very Good (VG)</option>
                  <option value="G+">Good+ (G+)</option>
                  <option value="G">Good (G)</option>
                  <option value="F">Fair (F)</option>
                  <option value="P">Poor (P)</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Par défaut à "Mint" pour les produits neufs. Ajustez si nécessaire pour les produits d'occasion.
            </p>
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
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
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
                    value={formData.purchase_price || 0}
                    onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) || null })}
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
                  value={formData.stock_threshold}
                  onChange={(e) => setFormData({ ...formData, stock_threshold: Number(e.target.value) })}
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
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditMode ? "Enregistrer" : "Créer le produit"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
