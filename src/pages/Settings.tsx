import { useState } from "react";
import { Settings, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";

export function SettingsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  
  const [formData, setFormData] = useState({
    shop_name: "",
    legal_name: "",
    shop_email: "",
    shop_phone: "",
    shop_address: "",
    shop_city: "",
    shop_postal_code: "",
    shop_country: "",
    vat_number: "",
    siret: "",
    vat_rate: 20,
    default_currency: "EUR",
    invoice_prefix: "FC",
    invoice_next_number: 1001,
    payout_invoice_prefix: "REV",
    payout_invoice_next_number: 1,
  });

  // Initialize form when settings load
  useState(() => {
    if (settings) {
      setFormData({
        shop_name: settings.shop_name || "",
        legal_name: settings.legal_name || "",
        shop_email: settings.shop_email || "",
        shop_phone: settings.shop_phone || "",
        shop_address: settings.shop_address || "",
        shop_city: settings.shop_city || "",
        shop_postal_code: settings.shop_postal_code || "",
        shop_country: settings.shop_country || "",
        vat_number: settings.vat_number || "",
        siret: settings.siret || "",
        vat_rate: settings.vat_rate || 20,
        default_currency: settings.default_currency || "EUR",
        invoice_prefix: settings.invoice_prefix || "FC",
        invoice_next_number: settings.invoice_next_number || 1001,
        payout_invoice_prefix: settings.payout_invoice_prefix || "REV",
        payout_invoice_next_number: settings.payout_invoice_next_number || 1,
      });
    }
  });

  // Update form when settings change
  if (settings && formData.shop_name === "" && settings.shop_name) {
    setFormData({
      shop_name: settings.shop_name || "",
      legal_name: settings.legal_name || "",
      shop_email: settings.shop_email || "",
      shop_phone: settings.shop_phone || "",
      shop_address: settings.shop_address || "",
      shop_city: settings.shop_city || "",
      shop_postal_code: settings.shop_postal_code || "",
      shop_country: settings.shop_country || "",
      vat_number: settings.vat_number || "",
      siret: settings.siret || "",
      vat_rate: settings.vat_rate || 20,
      default_currency: settings.default_currency || "EUR",
      invoice_prefix: settings.invoice_prefix || "FC",
      invoice_next_number: settings.invoice_next_number || 1001,
      payout_invoice_prefix: settings.payout_invoice_prefix || "REV",
      payout_invoice_next_number: settings.payout_invoice_next_number || 1,
    });
  }

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(formData);
      toast({ title: "Paramètres enregistrés", description: "Les modifications ont été sauvegardées." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Paramètres</h1>
            <p className="text-sm text-muted-foreground">Configuration de la boutique et facturation</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
          {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </Button>
      </div>

      {/* Shop Info */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Informations boutique</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Nom de la boutique</Label>
            <Input
              value={formData.shop_name}
              onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Raison sociale</Label>
            <Input
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Email</Label>
            <Input
              type="email"
              value={formData.shop_email}
              onChange={(e) => setFormData({ ...formData, shop_email: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Téléphone</Label>
            <Input
              value={formData.shop_phone}
              onChange={(e) => setFormData({ ...formData, shop_phone: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-sm text-muted-foreground">Adresse</Label>
            <Input
              value={formData.shop_address}
              onChange={(e) => setFormData({ ...formData, shop_address: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Ville</Label>
            <Input
              value={formData.shop_city}
              onChange={(e) => setFormData({ ...formData, shop_city: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Code postal</Label>
            <Input
              value={formData.shop_postal_code}
              onChange={(e) => setFormData({ ...formData, shop_postal_code: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Pays</Label>
            <Input
              value={formData.shop_country}
              onChange={(e) => setFormData({ ...formData, shop_country: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Fiscal Info */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Informations fiscales</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">N° TVA intracommunautaire</Label>
            <Input
              value={formData.vat_number}
              onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">SIRET</Label>
            <Input
              value={formData.siret}
              onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Taux TVA (%)</Label>
            <Input
              type="number"
              value={formData.vat_rate}
              onChange={(e) => setFormData({ ...formData, vat_rate: Number(e.target.value) })}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Devise par défaut</Label>
            <select
              value={formData.default_currency}
              onChange={(e) => setFormData({ ...formData, default_currency: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background"
            >
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Numérotation des factures</h2>
        <div className="grid grid-cols-2 gap-6">
          {/* Customer invoices */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Factures clients</h3>
            <div>
              <Label className="text-sm text-muted-foreground">Préfixe</Label>
              <Input
                value={formData.invoice_prefix}
                onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value })}
                className="mt-1"
                placeholder="FC"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Prochain numéro</Label>
              <Input
                type="number"
                value={formData.invoice_next_number}
                onChange={(e) => setFormData({ ...formData, invoice_next_number: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <span className="text-xs text-muted-foreground">Prochaine facture:</span>
              <span className="ml-2 font-mono font-medium">
                {formData.invoice_prefix}-{String(formData.invoice_next_number).padStart(5, '0')}
              </span>
            </div>
          </div>

          {/* Payout invoices */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Factures reversements fournisseurs</h3>
            <div>
              <Label className="text-sm text-muted-foreground">Préfixe</Label>
              <Input
                value={formData.payout_invoice_prefix}
                onChange={(e) => setFormData({ ...formData, payout_invoice_prefix: e.target.value })}
                className="mt-1"
                placeholder="REV"
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Prochain numéro</Label>
              <Input
                type="number"
                value={formData.payout_invoice_next_number}
                onChange={(e) => setFormData({ ...formData, payout_invoice_next_number: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <span className="text-xs text-muted-foreground">Prochaine facture:</span>
              <span className="ml-2 font-mono font-medium">
                {formData.payout_invoice_prefix}-{String(formData.payout_invoice_next_number).padStart(5, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
