
# Plan : Ajouter la clé Stripe Publishable au frontend

## Contexte du problème
L'erreur "Configuration Stripe manquante" apparaît car `VITE_STRIPE_PUBLISHABLE_KEY` n'est pas configurée dans le fichier `.env`. Les secrets Supabase ne sont accessibles qu'aux Edge Functions, pas au frontend Vite.

## Solution

### Étape 1 : Ajouter la variable au fichier .env

Modifier le fichier `.env` pour ajouter la clé publishable Stripe :

```
VITE_SUPABASE_PROJECT_ID="modgiywtysnpnyrgwuhn"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
VITE_SUPABASE_URL="https://modgiywtysnpnyrgwuhn.supabase.co"
VITE_DEBUG_SUPABASE="true"
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_VOTRE_CLE_PUBLISHABLE_ICI"
```

### Où trouver ta clé Stripe Publishable ?

1. Va sur https://dashboard.stripe.com/apikeys
2. Copie la clé **Publishable key** (commence par `pk_test_` en mode test ou `pk_live_` en production)
3. Cette clé est différente de la Secret key que tu as déjà configurée dans Supabase

### Pourquoi c'est sécurisé ?

La clé publishable est conçue pour être exposée côté client. Elle permet uniquement de :
- Afficher les formulaires Stripe Elements
- Tokeniser les informations de carte (sans les stocker)

Elle ne permet PAS de :
- Créer des charges
- Accéder aux données clients
- Modifier quoi que ce soit dans ton compte Stripe

---

## Détails techniques

### Fichier modifié
- `.env` : ajout de `VITE_STRIPE_PUBLISHABLE_KEY`

### Après modification
Le composant `PaymentCardForm.tsx` lira automatiquement la variable via `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY` et initialisera Stripe Elements correctement.

### Test
Après avoir ajouté la clé, rafraîchis la page et rouvre le modal "Ajouter un moyen de paiement" > onglet "Carte". Le formulaire Stripe Elements devrait s'afficher.
