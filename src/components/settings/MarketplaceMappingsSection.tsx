import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, Save, X, ArrowRight, ShoppingBag, RefreshCw } from "lucide-react";
import { MARKETPLACE_MAPPINGS, type MarketplaceMapping } from "@/lib/marketplace-column-mappings";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";

interface CustomMapping {
  sourceColumn: string;
  targetField: string;
}

interface CustomMarketplaceConfig {
  id: string;
  customMappings: CustomMapping[];
}

export function MarketplaceMappingsSection() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  
  const [editingMarketplace, setEditingMarketplace] = useState<string | null>(null);
  const [newMapping, setNewMapping] = useState<CustomMapping>({ sourceColumn: '', targetField: '' });
  
  // Get custom mappings from settings
  const customMappings = (settings?.custom_marketplace_mappings as Record<string, CustomMapping[]>) || {};
  
  const handleAddMapping = async (marketplaceId: string) => {
    if (!newMapping.sourceColumn || !newMapping.targetField) {
      toast({
        title: "Erreur",
        description: "Les deux champs sont requis",
        variant: "destructive"
      });
      return;
    }
    
    const currentMappings = customMappings[marketplaceId] || [];
    const updatedMappings = {
      ...customMappings,
      [marketplaceId]: [...currentMappings, { ...newMapping }]
    };
    
    try {
      await updateSettings.mutateAsync({
        custom_marketplace_mappings: updatedMappings
      });
      setNewMapping({ sourceColumn: '', targetField: '' });
      toast({
        title: "Mapping ajouté",
        description: `Nouveau mapping ajouté pour ${marketplaceId}`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le mapping",
        variant: "destructive"
      });
    }
  };
  
  const handleRemoveMapping = async (marketplaceId: string, index: number) => {
    const currentMappings = customMappings[marketplaceId] || [];
    const updatedMappings = {
      ...customMappings,
      [marketplaceId]: currentMappings.filter((_, i) => i !== index)
    };
    
    try {
      await updateSettings.mutateAsync({
        custom_marketplace_mappings: updatedMappings
      });
      toast({
        title: "Mapping supprimé",
        description: "Le mapping a été supprimé"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le mapping",
        variant: "destructive"
      });
    }
  };
  
  const handleResetMappings = async (marketplaceId: string) => {
    const updatedMappings = { ...customMappings };
    delete updatedMappings[marketplaceId];
    
    try {
      await updateSettings.mutateAsync({
        custom_marketplace_mappings: updatedMappings
      });
      toast({
        title: "Mappings réinitialisés",
        description: `Les mappings personnalisés de ${marketplaceId} ont été supprimés`
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de réinitialiser les mappings",
        variant: "destructive"
      });
    }
  };
  
  // Get all available target fields
  const targetFields = [
    { value: 'order_number', label: 'N° Commande' },
    { value: 'order_date', label: 'Date commande' },
    { value: 'customer_name', label: 'Nom client' },
    { value: 'customer_email', label: 'Email client' },
    { value: 'shipping_address', label: 'Adresse' },
    { value: 'shipping_address_line_2', label: 'Adresse ligne 2' },
    { value: 'shipping_city', label: 'Ville' },
    { value: 'shipping_postal_code', label: 'Code postal' },
    { value: 'shipping_country', label: 'Pays' },
    { value: 'shipping_phone', label: 'Téléphone' },
    { value: 'status', label: 'Statut commande' },
    { value: 'payment_status', label: 'Statut paiement' },
    { value: 'product_sku', label: 'SKU Produit' },
    { value: 'product_title', label: 'Titre produit' },
    { value: 'artist_name', label: 'Artiste' },
    { value: 'label_name', label: 'Label' },
    { value: 'format', label: 'Format' },
    { value: 'unit_price', label: 'Prix unitaire' },
    { value: 'quantity', label: 'Quantité' },
    { value: 'total_price', label: 'Prix total' },
    { value: 'shipping_amount', label: 'Frais de port' },
    { value: 'order_total', label: 'Total commande' },
    { value: 'notes', label: 'Notes client' },
    { value: 'internal_notes', label: 'Notes internes' },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Mappings des colonnes par Marketplace
        </CardTitle>
        <CardDescription>
          Personnalisez le mapping des colonnes pour chaque marketplace lors de l'import des commandes.
          Les mappings personnalisés sont prioritaires sur les mappings par défaut.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {Object.values(MARKETPLACE_MAPPINGS).map((marketplace) => {
            const marketplaceCustomMappings = customMappings[marketplace.id] || [];
            const isEditing = editingMarketplace === marketplace.id;
            
            return (
              <AccordionItem key={marketplace.id} value={marketplace.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{marketplace.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {Object.keys(marketplace.headerMapping).length} mappings par défaut
                    </Badge>
                    {marketplaceCustomMappings.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        +{marketplaceCustomMappings.length} personnalisé(s)
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 pt-4">
                    {/* Description */}
                    <p className="text-sm text-muted-foreground">
                      {marketplace.description}
                    </p>
                    
                    {/* Custom mappings */}
                    {marketplaceCustomMappings.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Mappings personnalisés</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetMappings(marketplace.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Réinitialiser
                          </Button>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Colonne source</TableHead>
                              <TableHead></TableHead>
                              <TableHead>Champ cible</TableHead>
                              <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {marketplaceCustomMappings.map((mapping, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-mono text-sm">
                                  {mapping.sourceColumn}
                                </TableCell>
                                <TableCell className="text-center">
                                  <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">
                                    {targetFields.find(f => f.value === mapping.targetField)?.label || mapping.targetField}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleRemoveMapping(marketplace.id, index)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    {/* Add new mapping */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <h4 className="text-sm font-medium mb-3">Ajouter un mapping personnalisé</h4>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Label htmlFor={`source-${marketplace.id}`} className="text-xs">
                            Colonne source (nom exact dans le fichier)
                          </Label>
                          <Input
                            id={`source-${marketplace.id}`}
                            placeholder="ex: Mon Champ Custom"
                            value={editingMarketplace === marketplace.id ? newMapping.sourceColumn : ''}
                            onChange={(e) => {
                              setEditingMarketplace(marketplace.id);
                              setNewMapping(prev => ({ ...prev, sourceColumn: e.target.value }));
                            }}
                            onFocus={() => setEditingMarketplace(marketplace.id)}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex items-center text-muted-foreground px-2">
                          <ArrowRight className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor={`target-${marketplace.id}`} className="text-xs">
                            Champ cible
                          </Label>
                          <select
                            id={`target-${marketplace.id}`}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                            value={editingMarketplace === marketplace.id ? newMapping.targetField : ''}
                            onChange={(e) => {
                              setEditingMarketplace(marketplace.id);
                              setNewMapping(prev => ({ ...prev, targetField: e.target.value }));
                            }}
                            onFocus={() => setEditingMarketplace(marketplace.id)}
                          >
                            <option value="">Sélectionner...</option>
                            {targetFields.map(field => (
                              <option key={field.value} value={field.value}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddMapping(marketplace.id)}
                          disabled={editingMarketplace !== marketplace.id || !newMapping.sourceColumn || !newMapping.targetField}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    </div>
                    
                    {/* Default mappings reference */}
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Voir les {Object.keys(marketplace.headerMapping).length} mappings par défaut
                      </summary>
                      <div className="mt-2 max-h-60 overflow-y-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Colonne source</TableHead>
                              <TableHead className="text-xs">Champ cible</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(marketplace.headerMapping).map(([source, target]) => (
                              <TableRow key={source}>
                                <TableCell className="font-mono text-xs py-1.5">{source}</TableCell>
                                <TableCell className="text-xs py-1.5">
                                  {targetFields.find(f => f.value === target)?.label || target}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </details>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
