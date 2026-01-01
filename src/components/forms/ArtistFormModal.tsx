import { useState } from "react";
import { X, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ArtistFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  artist?: {
    id: string;
    name: string;
    bio?: string;
    country?: string;
  } | null;
}

export function ArtistFormModal({ isOpen, onClose, artist }: ArtistFormModalProps) {
  const [name, setName] = useState(artist?.name || "");
  const [country, setCountry] = useState(artist?.country || "");
  const [bio, setBio] = useState(artist?.bio || "");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logique de sauvegarde à implémenter avec une base de données
    console.log("Artiste sauvegardé:", { name, country, bio });
    onClose();
  };

  const isEdit = !!artist;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
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
          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'artiste *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Erkin Koray"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Pays / Origine</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Ex: Turquie"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biographie</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Description de l'artiste..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {isEdit ? "Enregistrer" : "Créer l'artiste"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
