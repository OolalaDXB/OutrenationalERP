import { useState, useRef } from "react";
import { X, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DiscogsImageSearch } from "./DiscogsImageSearch";

interface ProductImageGalleryProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  mainImage: string | null;
  onMainImageChange: (url: string | null) => void;
  barcode?: string;
  title?: string;
  artist?: string;
}

export function ProductImageGallery({
  images,
  onImagesChange,
  mainImage,
  onMainImageChange,
  barcode,
  title,
  artist,
}: ProductImageGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        newImages.push(publicUrl);
      }

      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);

      // Set first image as main if none set
      if (!mainImage && newImages.length > 0) {
        onMainImageChange(newImages[0]);
      }

      toast({ 
        title: "Images téléchargées", 
        description: `${newImages.length} image(s) ajoutée(s)` 
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger les images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const imageToRemove = images[index];
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);

    // Update main image if removed
    if (mainImage === imageToRemove) {
      onMainImageChange(newImages.length > 0 ? newImages[0] : null);
    }
  };

  const handleSetAsMain = (url: string) => {
    onMainImageChange(url);
    toast({ title: "Image principale définie" });
  };

  const handleDiscogsImageSelect = (url: string) => {
    if (!images.includes(url)) {
      const newImages = [...images, url];
      onImagesChange(newImages);
      if (!mainImage) {
        onMainImageChange(url);
      }
      toast({ title: "Image ajoutée depuis Discogs" });
    }
  };

  const handleDiscogsImagesSelect = (urls: string[]) => {
    const newUrls = urls.filter(url => !images.includes(url));
    if (newUrls.length > 0) {
      const newImages = [...images, ...newUrls];
      onImagesChange(newImages);
      if (!mainImage && newUrls.length > 0) {
        onMainImageChange(newUrls[0]);
      }
      toast({ 
        title: "Images ajoutées depuis Discogs", 
        description: `${newUrls.length} image(s) ajoutée(s)` 
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Photos du produit</h3>
        <DiscogsImageSearch
          barcode={barcode}
          title={title}
          artist={artist}
          onImageSelect={handleDiscogsImageSelect}
          onImagesSelect={handleDiscogsImagesSelect}
        />
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        {/* Existing images */}
        {images.map((url, index) => (
          <div
            key={index}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 group cursor-pointer ${
              mainImage === url ? 'border-primary' : 'border-border hover:border-primary/50'
            }`}
            onClick={() => handleSetAsMain(url)}
          >
            <img
              src={url}
              alt={`Product ${index + 1}`}
              className="w-full h-full object-cover"
            />
            {mainImage === url && (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded">
                Principale
              </div>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage(index);
              }}
              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Upload button */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-secondary/30"
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Plus className="w-5 h-5 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Ajouter</span>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleImageUpload(e.target.files)}
      />

      <p className="text-xs text-muted-foreground mt-3">
        Cliquez sur une image pour la définir comme principale. Glissez-déposez ou cliquez sur + pour ajouter des images.
      </p>
    </div>
  );
}
