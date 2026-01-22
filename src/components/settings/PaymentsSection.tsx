import { useState } from "react";
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Star, 
  Check,
  CreditCard,
  Wallet,
  Bitcoin,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  useBankAccounts, 
  useCreateBankAccount, 
  useUpdateBankAccount, 
  useDeleteBankAccount,
  type BankAccount,
  type BankAccountInsert
} from "@/hooks/useBankAccounts";
import {
  usePaymentMethods,
  useTogglePaymentMethod,
  useUpdatePaymentMethodConfig,
  type PaymentMethod
} from "@/hooks/usePaymentMethods";
import { toast } from "@/hooks/use-toast";

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'Dollar ($)' },
  { code: 'GBP', label: 'Livre (£)' },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Wallet,
  CreditCard,
  Bitcoin,
};

export function PaymentsSection() {
  return (
    <div className="space-y-6">
      <BankAccountsSection />
      <PaymentMethodsSection />
    </div>
  );
}

function BankAccountsSection() {
  const { data: accounts = [], isLoading } = useBankAccounts();
  const createAccount = useCreateBankAccount();
  const updateAccount = useUpdateBankAccount();
  const deleteAccount = useDeleteBankAccount();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<BankAccountInsert>({
    bank_name: '',
    iban: '',
    bic: '',
    currency: 'EUR',
    is_default: false,
  });

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setFormData({ bank_name: '', iban: '', bic: '', currency: 'EUR', is_default: false });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      bank_name: account.bank_name,
      iban: account.iban,
      bic: account.bic,
      currency: account.currency,
      is_default: account.is_default,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingAccount) {
        await updateAccount.mutateAsync({ id: editingAccount.id, ...formData });
        toast({ title: "Compte mis à jour" });
      } else {
        await createAccount.mutateAsync(formData);
        toast({ title: "Compte ajouté" });
      }
      setIsModalOpen(false);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder le compte.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAccount.mutateAsync(deletingId);
      toast({ title: "Compte supprimé" });
      setIsDeleteOpen(false);
      setDeletingId(null);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer le compte.", variant: "destructive" });
    }
  };

  const handleSetDefault = async (account: BankAccount) => {
    try {
      await updateAccount.mutateAsync({ id: account.id, is_default: true });
      toast({ title: "Compte par défaut mis à jour" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Comptes bancaires</h2>
        </div>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un compte
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Configurez vos comptes bancaires par devise pour les virements.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Aucun compte bancaire configuré</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Banque</th>
                <th className="text-left py-2 font-medium text-muted-foreground">IBAN</th>
                <th className="text-left py-2 font-medium text-muted-foreground">BIC</th>
                <th className="text-left py-2 font-medium text-muted-foreground">Devise</th>
                <th className="text-center py-2 font-medium text-muted-foreground">Par défaut</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 font-medium">{account.bank_name}</td>
                  <td className="py-3 font-mono text-xs">{account.iban}</td>
                  <td className="py-3 font-mono">{account.bic}</td>
                  <td className="py-3">
                    <Badge variant="outline">{account.currency}</Badge>
                  </td>
                  <td className="py-3 text-center">
                    {account.is_default ? (
                      <Star className="w-4 h-4 text-yellow-500 mx-auto fill-yellow-500" />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(account)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Star className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(account)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => { setDeletingId(account.id); setIsDeleteOpen(true); }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccount ? 'Modifier le compte' : 'Ajouter un compte bancaire'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom de la banque</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Ex: Crédit Lyonnais"
              />
            </div>
            <div className="space-y-2">
              <Label>IBAN</Label>
              <Input
                value={formData.iban}
                onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>BIC / SWIFT</Label>
              <Input
                value={formData.bic}
                onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
                placeholder="CRLYFRPP"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
              <Label htmlFor="is_default">Compte par défaut pour cette devise</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleSave} 
              disabled={createAccount.isPending || updateAccount.isPending}
            >
              {(createAccount.isPending || updateAccount.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingAccount ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les commandes existantes ne seront pas affectées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PaymentMethodsSection() {
  const { data: methods = [], isLoading } = usePaymentMethods(false);
  const toggleMethod = useTogglePaymentMethod();
  const updateConfig = useUpdatePaymentMethodConfig();

  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const [configDrafts, setConfigDrafts] = useState<Record<string, Record<string, string>>>({});

  const handleToggle = async (method: PaymentMethod) => {
    try {
      await toggleMethod.mutateAsync({ id: method.id, active: !method.active });
      toast({ 
        title: method.active ? "Méthode désactivée" : "Méthode activée",
        description: method.name
      });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const handleConfigChange = (methodId: string, field: string, value: string) => {
    setConfigDrafts(prev => ({
      ...prev,
      [methodId]: {
        ...(prev[methodId] || {}),
        [field]: value
      }
    }));
  };

  const handleSaveConfig = async (method: PaymentMethod) => {
    const draft = configDrafts[method.id];
    if (!draft) return;

    try {
      await updateConfig.mutateAsync({
        id: method.id,
        config: { ...method.config, ...draft }
      });
      setConfigDrafts(prev => {
        const { [method.id]: _, ...rest } = prev;
        return rest;
      });
      toast({ title: "Configuration enregistrée" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const getConfigValue = (method: PaymentMethod, field: string) => {
    return configDrafts[method.id]?.[field] ?? method.config[field] ?? '';
  };

  const hasConfigChanges = (methodId: string) => {
    return Object.keys(configDrafts[methodId] || {}).length > 0;
  };

  const renderIcon = (iconName: string | null) => {
    const Icon = iconName ? ICON_MAP[iconName] || CreditCard : CreditCard;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold">Moyens de paiement</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Activez et configurez les moyens de paiement disponibles pour vos clients.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {methods.map((method) => (
            <Collapsible
              key={method.id}
              open={expandedMethod === method.id}
              onOpenChange={(open) => setExpandedMethod(open ? method.id : null)}
            >
              <div className={`border rounded-lg transition-colors ${method.active ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${method.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {renderIcon(method.icon)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{method.name}</span>
                        {method.active && <Badge variant="default" className="text-xs">Actif</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {method.currencies.map(c => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                    <Switch
                      checked={method.active}
                      onCheckedChange={() => handleToggle(method)}
                      disabled={toggleMethod.isPending}
                    />
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon">
                        {expandedMethod === method.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0 border-t border-border/50">
                    {method.code === 'bank_transfer' && (
                      <div className="pt-4">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p>
                            Le virement bancaire utilise les comptes configurés ci-dessus. 
                            Le compte par défaut de la devise choisie par le client sera affiché.
                          </p>
                        </div>
                      </div>
                    )}

                    {method.code === 'paypal' && (
                      <div className="pt-4 space-y-4">
                        <div className="space-y-2">
                          <Label>Email PayPal</Label>
                          <Input
                            type="email"
                            value={getConfigValue(method, 'email')}
                            onChange={(e) => handleConfigChange(method.id, 'email', e.target.value)}
                            placeholder="paiements@votreboutique.com"
                          />
                        </div>
                        {hasConfigChanges(method.id) && (
                          <Button size="sm" onClick={() => handleSaveConfig(method)} disabled={updateConfig.isPending}>
                            {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                            Enregistrer
                          </Button>
                        )}
                      </div>
                    )}

                    {method.code === 'stripe' && (
                      <div className="pt-4 space-y-4">
                        <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p>Nécessite un compte Stripe Business. L'intégration sera disponible prochainement.</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Clé publique Stripe</Label>
                          <Input
                            value={getConfigValue(method, 'publishable_key')}
                            onChange={(e) => handleConfigChange(method.id, 'publishable_key', e.target.value)}
                            placeholder="pk_live_..."
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Clé secrète Stripe</Label>
                          <Input
                            type="password"
                            value={getConfigValue(method, 'secret_key')}
                            onChange={(e) => handleConfigChange(method.id, 'secret_key', e.target.value)}
                            placeholder="sk_live_..."
                            className="font-mono text-sm"
                          />
                        </div>
                        {hasConfigChanges(method.id) && (
                          <Button size="sm" onClick={() => handleSaveConfig(method)} disabled={updateConfig.isPending}>
                            {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                            Enregistrer
                          </Button>
                        )}
                      </div>
                    )}

                    {method.code === 'crypto' && (
                      <div className="pt-4 space-y-4">
                        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p>Acceptez les paiements en USDC ou USDT (stablecoins). Uniquement disponible pour les paiements en USD.</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Adresse du wallet</Label>
                          <Input
                            value={getConfigValue(method, 'wallet_address')}
                            onChange={(e) => handleConfigChange(method.id, 'wallet_address', e.target.value)}
                            placeholder="0x..."
                            className="font-mono text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Réseau</Label>
                          <select
                            value={getConfigValue(method, 'network')}
                            onChange={(e) => handleConfigChange(method.id, 'network', e.target.value)}
                            className="w-full px-3 py-2 rounded-md border border-border bg-background"
                          >
                            <option value="">Sélectionner un réseau</option>
                            <option value="ethereum">Ethereum (ERC-20)</option>
                            <option value="polygon">Polygon</option>
                            <option value="arbitrum">Arbitrum</option>
                            <option value="base">Base</option>
                            <option value="optimism">Optimism</option>
                            <option value="solana">Solana</option>
                            <option value="tron">Tron (TRC-20)</option>
                            <option value="avalanche">Avalanche (C-Chain)</option>
                            <option value="bsc">BNB Chain (BEP-20)</option>
                          </select>
                        </div>
                        {hasConfigChanges(method.id) && (
                          <Button size="sm" onClick={() => handleSaveConfig(method)} disabled={updateConfig.isPending}>
                            {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                            Enregistrer
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
