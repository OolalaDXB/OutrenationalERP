import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, Building2, MapPin, Lock, Loader2, Save, Check, Globe, Receipt, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useProAuth } from "@/hooks/useProAuth";
import { useRecentProInvoices } from "@/hooks/useProInvoices";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)', flag: '🇪🇺' },
  { code: 'USD', label: 'Dollar ($)', flag: '🇺🇸' },
  { code: 'GBP', label: 'Livre (£)', flag: '🇬🇧' },
];

export function ProAccount() {
  const { customer, refreshCustomer } = useProAuth();
  const { data: recentInvoices = [], isLoading: invoicesLoading } = useRecentProInvoices(3);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  
  // Address form
  const [address, setAddress] = useState(customer?.address || '');
  const [addressLine2, setAddressLine2] = useState(customer?.address_line_2 || '');
  const [city, setCity] = useState(customer?.city || '');
  const [postalCode, setPostalCode] = useState(customer?.postal_code || '');
  const [country, setCountry] = useState(customer?.country || '');
  const [phone, setPhone] = useState(customer?.phone || '');

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preferences
  const [preferredCurrency, setPreferredCurrency] = useState(
    (customer as any)?.preferred_currency || 'EUR'
  );

  // Update local state when customer changes
  useEffect(() => {
    if (customer) {
      setAddress(customer.address || '');
      setAddressLine2(customer.address_line_2 || '');
      setCity(customer.city || '');
      setPostalCode(customer.postal_code || '');
      setCountry(customer.country || '');
      setPhone(customer.phone || '');
      setPreferredCurrency((customer as any)?.preferred_currency || 'EUR');
    }
  }, [customer]);

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          address,
          address_line_2: addressLine2,
          city,
          postal_code: postalCode,
          country,
          phone
        })
        .eq('id', customer.id);

      if (error) throw error;

      await refreshCustomer();
      toast({ title: "Adresse mise à jour", description: "Vos informations ont été enregistrées." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour l'adresse.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas.", variant: "destructive" });
      return;
    }

    if (newPassword.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères.", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      toast({ title: "Mot de passe modifié", description: "Votre mot de passe a été mis à jour." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de modifier le mot de passe.", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdatePreferences = async () => {
    if (!customer) return;

    setIsUpdatingPreferences(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          preferred_currency: preferredCurrency
        } as any)
        .eq('id', customer.id);

      if (error) throw error;

      await refreshCustomer();
      toast({ title: "Préférences mises à jour", description: "Votre devise préférée a été enregistrée." });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour les préférences.", variant: "destructive" });
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Mon compte</h1>
        <p className="text-muted-foreground">Gérez vos informations professionnelles</p>
      </div>

      {/* Company info (read-only) */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Informations entreprise</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Raison sociale</p>
            <p className="font-medium">{customer?.company_name || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{customer?.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">N° TVA</p>
            <p className="font-medium">{customer?.vat_number || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Remise professionnelle</p>
            <p className="font-medium text-primary">{customer?.discount_rate || 0}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Délai de paiement</p>
            <p className="font-medium">{customer?.payment_terms || 30} jours</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Pour modifier ces informations, contactez notre équipe commerciale.
        </p>
      </div>

      {/* Recent Invoices Summary */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold">Factures récentes</h2>
          </div>
          <Link to="/pro/invoices">
            <Button variant="ghost" size="sm" className="gap-1.5">
              Voir tout
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {invoicesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : recentInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune facture disponible
          </p>
        ) : (
          <div className="space-y-3">
            {recentInvoices.map(invoice => (
              <div 
                key={invoice.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{invoice.invoice_number}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(invoice.issue_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm tabular-nums">
                    {formatCurrency(invoice.total, invoice.currency || 'EUR')}
                  </p>
                  {invoice.status === 'paid' ? (
                    <Badge className="bg-success/10 text-success border-success text-xs">Payée</Badge>
                  ) : (
                    <Badge className="bg-warning/10 text-warning border-warning text-xs">En attente</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Préférences de paiement</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Devise préférée</Label>
            <select
              id="currency"
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 rounded-md border border-border bg-background"
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Cette devise sera présélectionnée lors du paiement
            </p>
          </div>

          {preferredCurrency !== ((customer as any)?.preferred_currency || 'EUR') && (
            <Button 
              onClick={handleUpdatePreferences} 
              disabled={isUpdatingPreferences}
              size="sm"
            >
              {isUpdatingPreferences ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          )}
        </div>
      </div>

      {/* Shipping address */}
      <form onSubmit={handleUpdateAddress} className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Adresse de livraison</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 rue du Commerce"
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="address2">Complément d'adresse</Label>
            <Input
              id="address2"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Bâtiment, étage..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Code postal</Label>
            <Input
              id="postalCode"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="75001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ville</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Pays</Label>
            <Input
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="France"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 1 23 45 67 89"
            />
          </div>
        </div>

        <Button type="submit" className="mt-4" disabled={isUpdating}>
          {isUpdating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </form>

      {/* Change password */}
      <form onSubmit={handleChangePassword} className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Modifier le mot de passe</h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <Button type="submit" variant="outline" className="mt-4" disabled={isChangingPassword || !newPassword}>
          {isChangingPassword ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-2" />
          )}
          Changer le mot de passe
        </Button>
      </form>
    </div>
  );
}
