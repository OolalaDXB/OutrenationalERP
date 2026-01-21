import { useState, useEffect } from "react";
import { X, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FormTextareaField, ValidationErrors, extractZodErrors } from "@/components/ui/form-field";
import { artistSchema, ArtistFormValues } from "@/lib/validations/schemas";
import { useCreateArtist, useUpdateArtist } from "@/hooks/useArtists";

interface ArtistFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  artist?: {
    id: string;
    name: string;
    bio?: string;
    country?: string;
    discogs_id?: string;
    image_url?: string;
  } | null;
}

export function ArtistFormModal({ isOpen, onClose, artist }: ArtistFormModalProps) {
  const createArtist = useCreateArtist();
  const updateArtist = useUpdateArtist();
  
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [discogs_id, setDiscogsId] = useState("");
  const [image_url, setImageUrl] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors<ArtistFormValues>>({});

  useEffect(() => {
    if (artist) {
      setName(artist.name || "");
      setCountry(artist.country || "");
      setBio(artist.bio || "");
      setDiscogsId(artist.discogs_id || "");
      setImageUrl(artist.image_url || "");
    } else {
      setName("");
      setCountry("");
      setBio("");
      setDiscogsId("");
      setImageUrl("");
    }
    setValidationErrors({});
  }, [artist, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      name: name.trim(),
      country: country.trim() || undefined,
      bio: bio.trim() || undefined,
      discogs_id: discogs_id.trim() || undefined,
      image_url: image_url.trim() || undefined,
    };

    const result = artistSchema.safeParse(formData);
    
    if (!result.success) {
      setValidationErrors(extractZodErrors<ArtistFormValues>(result.error));
      return;
    }

    setValidationErrors({});

    try {
      if (artist) {
        await updateArtist.mutateAsync({
          id: artist.id,
          name: formData.name,
          country: formData.country || null,
          bio: formData.bio || null,
          discogs_id: formData.discogs_id || null,
          image_url: formData.image_url || null,
        });
      } else {
        await createArtist.mutateAsync({
          name: formData.name,
          country: formData.country || null,
          bio: formData.bio || null,
          discogs_id: formData.discogs_id || null,
          image_url: formData.image_url || null,
        });
      }
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isEdit = !!artist;
  const isLoading = createArtist.isPending || updateArtist.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">
              {isEdit ? "Modifier l'artiste" : "Nouvel artiste"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormField
            id="name"
            label="Nom de l'artiste"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Erkin Koray"
            error={validationErrors.name}
          />

          <FormField
            id="country"
            label="Pays / Origine"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="Ex: Turquie"
            error={validationErrors.country}
          />

          <FormField
            id="discogs_id"
            label="ID Discogs"
            value={discogs_id}
            onChange={(e) => setDiscogsId(e.target.value)}
            placeholder="Identifiant Discogs (optionnel)"
            error={validationErrors.discogs_id}
          />

          <FormField
            id="image_url"
            label="URL de l'image"
            type="url"
            value={image_url}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            error={validationErrors.image_url}
          />

          <FormTextareaField
            id="bio"
            label="Biographie"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Description de l'artiste..."
            rows={4}
            error={validationErrors.bio}
          />

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer l'artiste"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
