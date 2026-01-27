# Plan de correction : Boutons, Sauvegarde et Paiements

## ✅ Corrections appliquées

### 1. AdminPlans.tsx - Alignement des boutons ✅
- Ajout de `gap-3` au DialogFooter de l'édition de plan (ligne 452)
- Ajout de `gap-3` au DialogFooter de l'édition d'add-on (ligne 486)

### 2. TenantBillingSettings.tsx (ERP) - Ajout de moyen de paiement ✅
- Création du composant `AddPaymentMethodDialog` avec 3 onglets (Carte, SEPA, Crypto)
- Formulaire complet avec validation et mutation vers `tenant_payment_methods`
- Support Ethereum, Polygon, Arbitrum, Base pour les crypto

### 3. TenantDetail.tsx (Control Panel) - Ajout de paiement dans l'onglet Billing ✅
- Ajout du bouton "Ajouter" dans la section moyens de paiement
- Modal identique avec 3 onglets (Carte, SEPA, Crypto)
- Mutation `addPaymentMethodMutation` pour insérer dans `tenant_payment_methods`
- Icônes dynamiques selon le type de paiement

## Fichiers modifiés

| Fichier | Modifications |
|---------|---------------|
| `src/pages/admin/AdminPlans.tsx` | `gap-3` ajouté aux 2 DialogFooter |
| `src/components/settings/TenantBillingSettings.tsx` | Nouveau composant `AddPaymentMethodDialog` |
| `src/pages/admin/TenantDetail.tsx` | Bouton + modal ajout paiement dans onglet Billing |

## Statut : TERMINÉ ✅
