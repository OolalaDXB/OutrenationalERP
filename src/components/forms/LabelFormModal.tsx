import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCreateLabel, useUpdateLabel, Label as LabelType } from "@/hooks/useLabels";

interface LabelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  label?: LabelType | null;
}

export function LabelFormModal({ isOpen, onClose, label }: LabelFormModalProps) {
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const isEditing = !!label;

  const [formData, setFormData] = useState({
    name: "",
    country: "",
    website: "",
    discogs_id: "",
  });

  useEffect(() => {
    if (label) {
      setFormData({
        name: label.name || "",
        country: label.country || "",
        website: label.website || "",
        discogs_id: label.discogs_id || "",
      });
    } else {
      setFormData({
        name: "",
        country: "",
        website: "",
        discogs_id: "",
      });
    }
  }, [label, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && label) {
        await updateLabel.mutateAsync({
          id: label.id,
          name: formData.name,
          country: formData.country || null,
          website: formData.website || null,
          discogs_id: formData.discogs_id || null,
        });
      } else {
        await createLabel.mutateAsync({
          name: formData.name,
          country: formData.country || null,
          website: formData.website || null,
          discogs_id: formData.discogs_id || null,
        });
      }
      onClose();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isLoading = createLabel.isPending || updateLabel.isPending;

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
          <div className="space-y-2">
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nom du label"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input
              id="country"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="ex: France, UK, USA..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Site web</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discogs_id">ID Discogs</Label>
            <Input
              id="discogs_id"
              value={formData.discogs_id}
              onChange={(e) => setFormData({ ...formData, discogs_id: e.target.value })}
              placeholder="Identifiant Discogs (optionnel)"
            />
          </div>

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
