import { useState } from "react";
import { Plus, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateLabel } from "@/hooks/useLabels";
import { toast } from "@/hooks/use-toast";

interface InlineLabelCreatorProps {
  onLabelCreated: (labelId: string, labelName: string) => void;
  onCancel: () => void;
}

export function InlineLabelCreator({ onLabelCreated, onCancel }: InlineLabelCreatorProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const createLabel = useCreateLabel();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return;
    }

    try {
      const label = await createLabel.mutateAsync({ 
        name: name.trim(),
        country: country.trim() || null,
        website: website.trim() || null,
      });
      toast({ title: "Label créé", description: `"${name}" a été ajouté` });
      onLabelCreated(label.id, label.name);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer le label", variant: "destructive" });
    }
  };

  return (
    <div className="p-3 border border-primary/30 rounded-lg bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-primary">Nouveau label</span>
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
            placeholder="Nom du label"
            className="mt-1 h-8 text-sm"
            autoFocus
          />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Pays</Label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="FR, US..."
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Site web</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://..."
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={createLabel.isPending || !name.trim()}
          className="flex-1"
        >
          {createLabel.isPending ? (
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

interface LabelSelectorWithCreateProps {
  value: string;
  onChange: (value: string) => void;
  labels: { id: string; name: string }[];
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function LabelSelectorWithCreate({
  value,
  onChange,
  labels,
  label = "Label",
  placeholder = "Aucun label",
  required = false,
}: LabelSelectorWithCreateProps) {
  const [isCreating, setIsCreating] = useState(false);

  const handleLabelCreated = (labelId: string) => {
    onChange(labelId);
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
          <InlineLabelCreator
            onLabelCreated={handleLabelCreated}
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
          {labels.map(l => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setIsCreating(true)}
          title="Créer un nouveau label"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
