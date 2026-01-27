

# Plan de correction : Boutons, Sauvegarde et Paiements

## Problemes identifies

### 1. AdminPlans.tsx - Boutons Annuler/Enregistrer non alignes (visible sur la capture d'ecran)
**Fichier** : `src/pages/admin/AdminPlans.tsx` (lignes 452-455)

Le DialogFooter dans le formulaire d'edition de plan a les boutons colles. Il faut ajouter un espacement (`gap-3`).

### 2. TenantDetail.tsx - Changement de plan fonctionne mais le bouton Save peut ne pas s'afficher correctement
**Fichier** : `src/pages/admin/TenantDetail.tsx` (lignes 384-392)

Le code actuel semble correct mais le bouton peut etre masque si `selectedPlanCode` n'est pas defini. Verification necessaire.

### 3. TenantBillingSettings.tsx (ERP) - Ajout de moyen de paiement ne fait rien
**Fichier** : `src/components/settings/TenantBillingSettings.tsx` (lignes 664-706)

Les boutons dans la modal "Ajouter un moyen de paiement" affichent juste un toast `toast.info('Redirection vers Stripe...')` ou `toast.info('Configuration crypto à venir')`. **Il n'y a PAS d'implementation reelle**.

### 4. AdminBilling.tsx (Control Panel) - Pas de fonctionnalite d'ajout de paiement pour l'admin
**Fichier** : `src/pages/admin/AdminBilling.tsx`

Cette page est en lecture seule - elle affiche les abonnements et factures mais ne permet pas d'ajouter des moyens de paiement pour un tenant depuis le Control Panel.

### 5. TenantDetail.tsx (Control Panel) - Onglet Billing sans ajout de paiement
**Fichier** : `src/pages/admin/TenantDetail.tsx` (onglet billing)

L'onglet Billing du TenantDetail affiche les moyens de paiement existants mais ne propose pas d'en ajouter.

---

## Corrections a appliquer

### Correction 1 : Alignement boutons dans AdminPlans.tsx

**Ligne 452-454** - Ajouter `gap-3` au DialogFooter :

```typescript
// AVANT
<DialogFooter className="mt-4 pt-4 border-t">
  <Button type="button" variant="outline" onClick={() => { setEditingPlan(null); setEditedCapabilities({}); }}>Annuler</Button>
  <Button type="submit" disabled={updatePlanMutation.isPending}>{updatePlanMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}</Button>
</DialogFooter>

// APRES
<DialogFooter className="mt-4 pt-4 border-t gap-3">
  <Button type="button" variant="outline" onClick={() => { setEditingPlan(null); setEditedCapabilities({}); }}>Annuler</Button>
  <Button type="submit" disabled={updatePlanMutation.isPending}>
    {updatePlanMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
  </Button>
</DialogFooter>
```

### Correction 2 : Alignement boutons Add-on (ligne 486-488)

```typescript
// AVANT
<DialogFooter className="mt-6">

// APRES
<DialogFooter className="mt-6 gap-3">
```

### Correction 3 : TenantBillingSettings - Implementation reelle de l'ajout de paiement

Remplacer les boutons qui font juste des `toast.info()` par une vraie implementation qui :
1. Cree un enregistrement dans `tenant_payment_methods`
2. Pour Stripe : Affiche un formulaire pour saisir les infos ou redirige vers Stripe Checkout
3. Pour Crypto : Affiche un formulaire pour entrer l'adresse wallet et le reseau

**Solution simplifiee** : Creer un formulaire dans la modal pour chaque type de paiement au lieu de rediriger.

### Correction 4 : TenantDetail (Control Panel) - Ajouter bouton d'ajout de paiement dans l'onglet Billing

Ajouter un bouton "Ajouter" dans la section moyens de paiement de l'onglet Billing, avec une modal permettant a l'admin d'ajouter un moyen de paiement pour le tenant.

---

## Details techniques

### Fichiers a modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/admin/AdminPlans.tsx` | Ajouter `gap-3` aux DialogFooter (lignes 452 et 486) |
| `src/components/settings/TenantBillingSettings.tsx` | Implementer les formulaires d'ajout de paiement |
| `src/pages/admin/TenantDetail.tsx` | Ajouter fonctionnalite d'ajout de paiement dans l'onglet Billing |

### Structure de la modal d'ajout de paiement (ERP)

```text
+------------------------------------------+
| Ajouter un moyen de paiement             |
+------------------------------------------+
| [Tabs: Carte | SEPA | Crypto]            |
|                                          |
| Tab Carte:                               |
|   Libelle: [_______________]             |
|   (Integration Stripe a configurer)      |
|                                          |
| Tab SEPA:                                |
|   Libelle: [_______________]             |
|   IBAN: [_______________]                |
|                                          |
| Tab Crypto:                              |
|   Libelle: [_______________]             |
|   Adresse wallet: [_______________]      |
|   Reseau: [Ethereum v]                   |
|                                          |
|         [Annuler]  [Ajouter]             |
+------------------------------------------+
```

### Mutation d'ajout de paiement

```typescript
const addPaymentMethodMutation = useMutation({
  mutationFn: async (paymentMethod: {
    type: string;
    label: string;
    crypto_wallet_address?: string;
    crypto_network?: string;
  }) => {
    const { error } = await supabase
      .from('tenant_payment_methods')
      .insert({
        tenant_id: tenant?.id,
        type: paymentMethod.type,
        label: paymentMethod.label,
        crypto_wallet_address: paymentMethod.crypto_wallet_address,
        crypto_network: paymentMethod.crypto_network,
        is_active: true,
        is_default: paymentMethods?.length === 0, // Premier = default
      });
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-payment-methods', tenant?.id] });
    toast.success('Moyen de paiement ajoute');
    setShowAddPaymentMethod(false);
  },
});
```

---

## Resume des actions

1. **AdminPlans.tsx** : Corriger l'alignement des boutons dans les 2 DialogFooter
2. **TenantBillingSettings.tsx** : Remplacer la modal actuelle par une vraie implementation avec formulaire multi-onglets
3. **TenantDetail.tsx** : Ajouter la possibilite d'ajouter des moyens de paiement depuis le Control Panel

