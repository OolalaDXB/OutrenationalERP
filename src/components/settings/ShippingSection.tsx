import { useState } from "react";
import { Truck, Edit, X, Plus, Trash2, Loader2, Globe, Scale, Package, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useShippingZonesWithRates,
  useUpdateShippingRate,
  useUpdateShippingZone,
  useCreateShippingZone,
  useDeleteShippingZone,
  type ShippingZoneWithRate,
} from "@/hooks/useShippingRates";

// Common country codes for quick add
const COMMON_COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Allemagne' },
  { code: 'BE', name: 'Belgique' },
  { code: 'NL', name: 'Pays-Bas' },
  { code: 'IT', name: 'Italie' },
  { code: 'ES', name: 'Espagne' },
  { code: 'PT', name: 'Portugal' },
  { code: 'AT', name: 'Autriche' },
  { code: 'CH', name: 'Suisse' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'IE', name: 'Irlande' },
  { code: 'GB', name: 'Royaume-Uni' },
  { code: 'PL', name: 'Pologne' },
  { code: 'CZ', name: 'Tchéquie' },
  { code: 'DK', name: 'Danemark' },
  { code: 'SE', name: 'Suède' },
  { code: 'NO', name: 'Norvège' },
  { code: 'FI', name: 'Finlande' },
  { code: 'US', name: 'États-Unis' },
  { code: 'CA', name: 'Canada' },
  { code: 'JP', name: 'Japon' },
  { code: 'AU', name: 'Australie' },
];

const RATE_TYPE_OPTIONS = [
  { value: 'flat', label: 'Forfaitaire', icon: Package, description: 'Prix fixe par commande' },
  { value: 'per_weight', label: 'Par poids', icon: Scale, description: 'Prix de base + prix/kg' },
  { value: 'per_item', label: 'Par article', icon: Layers, description: 'Prix de base + prix/article supplémentaire' },
  { value: 'combined', label: 'Combiné', icon: Truck, description: 'Prix de base + poids + articles' },
];

function ZoneEditDialog({ 
  zone, 
  onClose 
}: { 
  zone: ShippingZoneWithRate; 
  onClose: () => void;
}) {
  const { toast } = useToast();
  const updateRate = useUpdateShippingRate();
  const updateZone = useUpdateShippingZone();
  
  const [price, setPrice] = useState(zone.rate?.price?.toString() || '0');
  const [freeAbove, setFreeAbove] = useState(zone.rate?.free_above?.toString() || '');
  const [rateType, setRateType] = useState<'flat' | 'per_weight' | 'per_item' | 'combined'>(
    (zone.rate?.rate_type as any) || 'flat'
  );
  const [perKgPrice, setPerKgPrice] = useState(zone.rate?.per_kg_price?.toString() || '');
  const [perItemPrice, setPerItemPrice] = useState(zone.rate?.per_item_price?.toString() || '');
  const [countries, setCountries] = useState<string[]>(zone.countries);
  const [newCountry, setNewCountry] = useState('');

  const handleSave = async () => {
    try {
      // Update rate
      await updateRate.mutateAsync({
        zoneId: zone.id,
        price: parseFloat(price) || 0,
        freeAbove: freeAbove ? parseFloat(freeAbove) : null,
        rateType,
        perKgPrice: perKgPrice ? parseFloat(perKgPrice) : null,
        perItemPrice: perItemPrice ? parseFloat(perItemPrice) : null,
      });

      // Update countries if changed
      if (JSON.stringify(countries) !== JSON.stringify(zone.countries)) {
        await updateZone.mutateAsync({
          id: zone.id,
          countries
        });
      }

      toast({ title: "Zone mise à jour", description: `Les tarifs pour "${zone.name}" ont été enregistrés.` });
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les modifications.", variant: "destructive" });
    }
  };

  const addCountry = (code: string) => {
    if (code && !countries.includes(code.toUpperCase())) {
      setCountries([...countries, code.toUpperCase()]);
    }
    setNewCountry('');
  };

  const removeCountry = (code: string) => {
    setCountries(countries.filter(c => c !== code));
  };

  const isWildcard = countries.includes('*');
  const showPerKg = rateType === 'per_weight' || rateType === 'combined';
  const showPerItem = rateType === 'per_item' || rateType === 'combined';

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Modifier la zone "{zone.name}"</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6 py-4">
        {/* Rate Type */}
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Type de tarification</Label>
          <Select value={rateType} onValueChange={(v) => setRateType(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATE_TYPE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                    <span className="text-xs text-muted-foreground ml-1">({opt.description})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Base Rate settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">
              {rateType === 'flat' ? 'Tarif fixe (€)' : 'Tarif de base (€)'}
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Franco de port à partir de (€)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={freeAbove}
              onChange={(e) => setFreeAbove(e.target.value)}
              placeholder="Optionnel"
              className="mt-1"
            />
          </div>
        </div>

        {/* Per kg pricing */}
        {showPerKg && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4" />
              Tarification au poids
            </Label>
            <div>
              <Label className="text-xs text-muted-foreground">Prix par kg (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={perKgPrice}
                onChange={(e) => setPerKgPrice(e.target.value)}
                placeholder="Ex: 2.50"
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* Per item pricing */}
        {showPerItem && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4" />
              Tarification par article
            </Label>
            <div>
              <Label className="text-xs text-muted-foreground">Prix par article supplémentaire (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={perItemPrice}
                onChange={(e) => setPerItemPrice(e.target.value)}
                placeholder="Ex: 1.00"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Le premier article est inclus dans le tarif de base
              </p>
            </div>
          </div>
        )}

        {/* Countries */}
        {!isWildcard && (
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Pays de la zone</Label>
            
            {/* Current countries */}
            <div className="flex flex-wrap gap-2 mb-3">
              {countries.map(code => (
                <Badge key={code} variant="secondary" className="gap-1">
                  {code}
                  <button
                    onClick={() => removeCountry(code)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
              {countries.length === 0 && (
                <span className="text-sm text-muted-foreground">Aucun pays</span>
              )}
            </div>

            {/* Add country */}
            <div className="flex gap-2">
              <Input
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value.toUpperCase())}
                placeholder="Code pays (ex: FR)"
                className="flex-1"
                maxLength={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCountry(newCountry);
                  }
                }}
              />
              <Button 
                variant="outline" 
                onClick={() => addCountry(newCountry)}
                disabled={!newCountry}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick add buttons */}
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">Ajout rapide :</p>
              <div className="flex flex-wrap gap-1">
                {COMMON_COUNTRIES.filter(c => !countries.includes(c.code)).slice(0, 12).map(c => (
                  <button
                    key={c.code}
                    onClick={() => addCountry(c.code)}
                    className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
                    title={c.name}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isWildcard && (
          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <Globe className="w-4 h-4 inline mr-2" />
            Cette zone s'applique à tous les pays non couverts par les autres zones.
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button 
          onClick={handleSave}
          disabled={updateRate.isPending || updateZone.isPending}
        >
          {(updateRate.isPending || updateZone.isPending) && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          Enregistrer
        </Button>
      </div>
    </DialogContent>
  );
}

function CreateZoneDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const createZone = useCreateShippingZone();
  
  const [name, setName] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [newCountry, setNewCountry] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Erreur", description: "Le nom de la zone est requis.", variant: "destructive" });
      return;
    }

    try {
      await createZone.mutateAsync({
        name: name.trim(),
        countries
      });
      toast({ title: "Zone créée", description: `La zone "${name}" a été créée.` });
      onClose();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de créer la zone.", variant: "destructive" });
    }
  };

  const addCountry = (code: string) => {
    if (code && !countries.includes(code.toUpperCase())) {
      setCountries([...countries, code.toUpperCase()]);
    }
    setNewCountry('');
  };

  const removeCountry = (code: string) => {
    setCountries(countries.filter(c => c !== code));
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Nouvelle zone de livraison</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        <div>
          <Label className="text-sm text-muted-foreground">Nom de la zone</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Amérique du Nord"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Pays de la zone</Label>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {countries.map(code => (
              <Badge key={code} variant="secondary" className="gap-1">
                {code}
                <button
                  onClick={() => removeCountry(code)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              value={newCountry}
              onChange={(e) => setNewCountry(e.target.value.toUpperCase())}
              placeholder="Code pays (ex: US)"
              className="flex-1"
              maxLength={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCountry(newCountry);
                }
              }}
            />
            <Button 
              variant="outline" 
              onClick={() => addCountry(newCountry)}
              disabled={!newCountry}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">Ajout rapide :</p>
            <div className="flex flex-wrap gap-1">
              {COMMON_COUNTRIES.filter(c => !countries.includes(c.code)).slice(0, 12).map(c => (
                <button
                  key={c.code}
                  onClick={() => addCountry(c.code)}
                  className="text-xs px-2 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
                  title={c.name}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Annuler</Button>
        <Button 
          onClick={handleCreate}
          disabled={createZone.isPending || !name.trim()}
        >
          {createZone.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Créer la zone
        </Button>
      </div>
    </DialogContent>
  );
}

export function ShippingSection() {
  const { toast } = useToast();
  const { data: zones, isLoading } = useShippingZonesWithRates();
  const deleteZone = useDeleteShippingZone();
  
  const [editingZone, setEditingZone] = useState<ShippingZoneWithRate | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleDeleteZone = async (id: string, name: string) => {
    try {
      await deleteZone.mutateAsync(id);
      toast({ title: "Zone supprimée", description: `La zone "${name}" a été supprimée.` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la zone.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Zones de livraison
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les tarifs de livraison par zone géographique
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle zone
            </Button>
          </DialogTrigger>
          <CreateZoneDialog onClose={() => setShowCreateDialog(false)} />
        </Dialog>
      </div>

      {/* Zones list */}
      <div className="grid gap-4">
        {zones?.map(zone => (
          <div 
            key={zone.id}
            className="bg-card rounded-xl border border-border p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{zone.name}</h3>
                  {zone.countries.includes('*') && (
                    <Badge variant="secondary">
                      <Globe className="w-3 h-3 mr-1" />
                      Fallback
                    </Badge>
                  )}
                </div>
                
                {/* Countries */}
                {!zone.countries.includes('*') && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {zone.countries.slice(0, 10).map(code => (
                      <Badge key={code} variant="outline" className="text-xs">
                        {code}
                      </Badge>
                    ))}
                    {zone.countries.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{zone.countries.length - 10}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Rate info */}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {/* Rate type badge */}
                  {zone.rate?.rate_type && zone.rate.rate_type !== 'flat' && (
                    <Badge variant="outline" className="text-xs">
                      {zone.rate.rate_type === 'per_weight' && <Scale className="w-3 h-3 mr-1" />}
                      {zone.rate.rate_type === 'per_item' && <Layers className="w-3 h-3 mr-1" />}
                      {zone.rate.rate_type === 'combined' && <Truck className="w-3 h-3 mr-1" />}
                      {zone.rate.rate_type === 'per_weight' && 'Poids'}
                      {zone.rate.rate_type === 'per_item' && 'Articles'}
                      {zone.rate.rate_type === 'combined' && 'Combiné'}
                    </Badge>
                  )}
                  
                  <div>
                    <span className="text-muted-foreground">Base: </span>
                    <span className="font-medium">{zone.rate?.price || 0} €</span>
                  </div>
                  
                  {zone.rate?.per_kg_price && (
                    <div>
                      <span className="text-muted-foreground">+ </span>
                      <span className="font-medium">{zone.rate.per_kg_price} €/kg</span>
                    </div>
                  )}
                  
                  {zone.rate?.per_item_price && (
                    <div>
                      <span className="text-muted-foreground">+ </span>
                      <span className="font-medium">{zone.rate.per_item_price} €/art. suppl.</span>
                    </div>
                  )}
                  
                  {zone.rate?.free_above && (
                    <div>
                      <span className="text-muted-foreground">Franco: </span>
                      <span className="font-medium text-success">{zone.rate.free_above} €</span>
                    </div>
                  )}
                  {!zone.rate?.free_above && (
                    <span className="text-muted-foreground text-xs">Pas de franco de port</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Dialog open={editingZone?.id === zone.id} onOpenChange={(open) => !open && setEditingZone(null)}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingZone(zone)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  {editingZone?.id === zone.id && (
                    <ZoneEditDialog 
                      zone={editingZone} 
                      onClose={() => setEditingZone(null)} 
                    />
                  )}
                </Dialog>

                {!zone.countries.includes('*') && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la zone ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          La zone "{zone.name}" et ses tarifs seront supprimés. Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteZone(zone.id, zone.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        ))}

        {(!zones || zones.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucune zone de livraison configurée</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer une zone
            </Button>
          </div>
        )}
      </div>

      {/* Help text */}
      <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-2">
        <p>
          <strong>Comment ça marche :</strong> Lors du checkout, le pays du client est comparé aux zones dans l'ordre. 
          La première zone correspondante définit le tarif. La zone "Monde" (avec *) sert de fallback pour les pays non couverts.
        </p>
        <p>
          <strong>Types de tarification :</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong>Forfaitaire</strong> : Prix fixe par commande</li>
          <li><strong>Par poids</strong> : Prix de base + prix par kg</li>
          <li><strong>Par article</strong> : Prix de base + prix par article supplémentaire</li>
          <li><strong>Combiné</strong> : Prix de base + poids + articles supplémentaires</li>
        </ul>
      </div>
    </div>
  );
}
