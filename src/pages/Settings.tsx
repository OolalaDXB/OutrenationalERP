import { useState, useRef } from "react";
import { Settings, Save, Loader2, Upload, Image, X, Building, FileText, CreditCard, Receipt, Palette, ToggleLeft, Database, BarChart3, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VatCacheSection } from "@/components/settings/VatCacheSection";
import { WidgetVisibilitySection, defaultWidgetVisibility, defaultWidgetOrder, type WidgetVisibility, type WidgetOrder } from "@/components/settings/WidgetVisibilitySection";
import { SalesChannelsSection } from "@/components/settings/SalesChannelsSection";
import { MarketplaceMappingsSection } from "@/components/settings/MarketplaceMappingsSection";

export function SettingsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
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
    shop_logo_url: "",
    // New invoice fields
    payment_terms_text: "",
    legal_mentions: "",
    bank_name: "",
    iban: "",
    bic: "",
    eori: "",
    cgv: "",
    // Feature toggles
    show_artists_section: false,
    // Widget visibility and order
    visible_widgets: defaultWidgetVisibility,
    widget_order: defaultWidgetOrder,
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
        shop_logo_url: settings.shop_logo_url || "",
        payment_terms_text: settings.payment_terms_text || "",
        legal_mentions: settings.legal_mentions || "",
        bank_name: settings.bank_name || "",
        iban: settings.iban || "",
        bic: settings.bic || "",
        eori: settings.eori || "",
        cgv: settings.cgv || "",
        show_artists_section: settings.show_artists_section || false,
        visible_widgets: settings.visible_widgets || defaultWidgetVisibility,
        widget_order: settings.widget_order || defaultWidgetOrder,
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
      shop_logo_url: settings.shop_logo_url || "",
      payment_terms_text: settings.payment_terms_text || "",
      legal_mentions: settings.legal_mentions || "",
      bank_name: settings.bank_name || "",
      iban: settings.iban || "",
      bic: settings.bic || "",
      eori: settings.eori || "",
      cgv: settings.cgv || "",
      show_artists_section: settings.show_artists_section || false,
      visible_widgets: settings.visible_widgets || defaultWidgetVisibility,
      widget_order: settings.widget_order || defaultWidgetOrder,
    });
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Erreur", description: "L'image ne doit pas dépasser 2Mo", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('shop-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('shop-assets')
        .getPublicUrl(filePath);

      setFormData({ ...formData, shop_logo_url: publicUrl });
      toast({ title: "Logo uploadé", description: "N'oubliez pas d'enregistrer les modifications" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Erreur", description: "Impossible d'uploader le logo", variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData({ ...formData, shop_logo_url: "" });
  };

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

      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="shop" className="gap-2">
            <Building className="w-4 h-4" />
            Boutique
          </TabsTrigger>
          <TabsTrigger value="fiscal" className="gap-2">
            <Receipt className="w-4 h-4" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="w-4 h-4" />
            Factures
          </TabsTrigger>
          <TabsTrigger value="banking" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Bancaire
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-2">
            <Store className="w-4 h-4" />
            Canaux
          </TabsTrigger>
          <TabsTrigger value="mappings" className="gap-2">
            <FileText className="w-4 h-4" />
            Mappings
          </TabsTrigger>
          <TabsTrigger value="widgets" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Widgets
          </TabsTrigger>
          <TabsTrigger value="vat-cache" className="gap-2">
            <Database className="w-4 h-4" />
            Cache TVA
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <ToggleLeft className="w-4 h-4" />
            Fonctions
          </TabsTrigger>
        </TabsList>

        {/* Shop Tab */}
        <TabsContent value="shop" className="space-y-6">
          {/* Logo Section */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Image className="w-5 h-5" />
              Logo de la boutique
            </h2>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {formData.shop_logo_url ? (
                  <div className="relative">
                    <img 
                      src={formData.shop_logo_url} 
                      alt="Logo boutique" 
                      className="w-32 h-32 object-contain rounded-lg border border-border bg-white p-2"
                    />
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-secondary/30">
                    <Image className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-3">
                  Le logo apparaîtra sur vos factures et bordereaux d'expédition. 
                  Format recommandé : PNG ou SVG avec fond transparent, max 2Mo.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {formData.shop_logo_url ? "Changer le logo" : "Uploader un logo"}
                </Button>
              </div>
            </div>
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
        </TabsContent>

        {/* Fiscal Tab */}
        <TabsContent value="fiscal" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Informations fiscales</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">N° TVA intracommunautaire</Label>
                <Input
                  value={formData.vat_number}
                  onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
                  className="mt-1"
                  placeholder="FR12345678901"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">SIRET</Label>
                <Input
                  value={formData.siret}
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  className="mt-1"
                  placeholder="123 456 789 00012"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">EORI</Label>
                <Input
                  value={formData.eori}
                  onChange={(e) => setFormData({ ...formData, eori: e.target.value })}
                  className="mt-1"
                  placeholder="FR12345678901234"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Taux TVA par défaut (%)</Label>
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
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          {/* Invoice Numbering */}
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

          {/* Payment Terms & Legal */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Mentions sur les factures</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-muted-foreground">Conditions de paiement</Label>
                <Textarea
                  value={formData.payment_terms_text}
                  onChange={(e) => setFormData({ ...formData, payment_terms_text: e.target.value })}
                  className="mt-1"
                  placeholder="Ex: Paiement à réception de facture. Escompte pour règlement anticipé : 0%"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Mentions légales</Label>
                <Textarea
                  value={formData.legal_mentions}
                  onChange={(e) => setFormData({ ...formData, legal_mentions: e.target.value })}
                  className="mt-1"
                  placeholder="Ex: En cas de retard de paiement, une indemnité forfaitaire de 40€ sera due..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* CGV Section */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-2">Conditions Générales de Vente (CGV)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Les CGV seront ajoutées en dernière page de vos factures si renseignées.
            </p>
            <div>
              <Textarea
                value={formData.cgv}
                onChange={(e) => setFormData({ ...formData, cgv: e.target.value })}
                className="mt-1 font-mono text-xs"
                placeholder="Saisissez vos conditions générales de vente ici...

Article 1 - Objet
Les présentes conditions générales de vente régissent les ventes de produits...

Article 2 - Prix
Les prix de nos produits sont indiqués en euros..."
                rows={12}
              />
              {formData.cgv && (
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.cgv.length} caractères • ~{Math.ceil(formData.cgv.length / 2500)} page(s) sur la facture
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Banking Tab */}
        <TabsContent value="banking" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Coordonnées bancaires</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ces informations apparaîtront en bas de vos factures pour faciliter le paiement.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-sm text-muted-foreground">Nom de la banque</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="mt-1"
                  placeholder="Ex: Crédit Lyonnais"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-sm text-muted-foreground">IBAN</Label>
                <Input
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  className="mt-1 font-mono"
                  placeholder="FR76 1234 5678 9012 3456 7890 123"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">BIC / SWIFT</Label>
                <Input
                  value={formData.bic}
                  onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
                  className="mt-1 font-mono"
                  placeholder="CRLYFRPP"
                />
              </div>
            </div>

            {/* Preview */}
            {(formData.iban || formData.bic) && (
              <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Aperçu sur facture</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  {formData.bank_name && <span>{formData.bank_name} - </span>}
                  IBAN : {formData.iban || '...'} / BIC : {formData.bic || '...'}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Sales Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <SalesChannelsSection />
        </TabsContent>

        {/* Marketplace Mappings Tab */}
        <TabsContent value="mappings" className="space-y-6">
          <MarketplaceMappingsSection />
        </TabsContent>

        {/* Widgets Tab */}
        <TabsContent value="widgets" className="space-y-6">
          <WidgetVisibilitySection
            visibility={formData.visible_widgets}
            order={formData.widget_order}
            onChange={(visibility, order) => setFormData({ ...formData, visible_widgets: visibility, widget_order: order })}
          />
        </TabsContent>

        {/* VAT Cache Tab */}
        <TabsContent value="vat-cache" className="space-y-6">
          <VatCacheSection />
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-2">Modules optionnels</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Activez ou désactivez les sections du catalogue selon vos besoins.
            </p>

            <div className="space-y-4">
              {/* Artists Toggle */}
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Section Artistes</p>
                    <p className="text-sm text-muted-foreground">
                      Afficher la gestion des artistes dans le menu Catalogue
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.show_artists_section}
                  onCheckedChange={(checked) => setFormData({ ...formData, show_artists_section: checked })}
                />
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                💡 La section Labels est toujours active car elle représente la structure principale du catalogue (Fournisseur → Labels → Produits).
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
