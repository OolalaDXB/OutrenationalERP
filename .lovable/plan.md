

# Plan : Alignement des boutons et création de subscription

## Problemes identifies

### Probleme 1 : Cards de plans avec hauteurs differentes
**Localisation** : `src/components/settings/TenantBillingSettings.tsx`, lignes 506-534

Les cards affichent les plans mais :
- Les hauteurs varient selon la longueur de la description
- Le `CardFooter` est rendu conditionnellement (`!isCurrent`) donc les cards sans bouton sont plus courtes
- Pas d'alignement vertical des boutons

### Probleme 2 : Pas de logique pour creer/changer de subscription
**Localisation** : `src/components/settings/TenantBillingSettings.tsx`, ligne 526-528

Le bouton "Selectionner" n'a pas de `onClick` handler. Il ne fait rien.
Le state `showUpgradeDialog` (ligne 267) n'est connecte a aucun Dialog.

### Probleme 3 : Bouton "Changer de plan" inutile
**Localisation** : ligne 492

Le bouton ouvre `setShowUpgradeDialog(true)` mais aucun Dialog n'existe pour cet etat.

---

## Solution

### Correction 1 : Egaliser les hauteurs des cards avec Flexbox

Ajouter `flex flex-col` aux cards et `mt-auto` au CardFooter pour pousser les boutons en bas.
Toujours rendre le CardFooter (meme pour le plan actuel) avec un espace reserve.

```typescript
// Ligne 510 - Ajouter flex flex-col h-full
<Card key={plan.id} className={`flex flex-col ${isCurrent ? 'border-primary' : ''}`}>

// Ligne 517 - Ajouter flex-1 pour etendre le contenu
<CardContent className="flex-1">

// Lignes 523-530 - Toujours rendre le CardFooter avec mt-auto
<CardFooter className="mt-auto">
  {isCurrent ? (
    <div className="w-full h-9" /> // Espace reserve pour alignement
  ) : (
    <Button variant="outline" className="w-full" size="sm" onClick={() => handleSelectPlan(plan.code)}>
      Selectionner
    </Button>
  )}
</CardFooter>
```

### Correction 2 : Ajouter la mutation pour creer/changer de subscription

Ajouter une mutation qui appelle la RPC `create_tenant_subscription` :

```typescript
const selectPlanMutation = useMutation({
  mutationFn: async (planCode: string) => {
    const { data, error } = await supabase.rpc('create_tenant_subscription', {
      p_tenant_id: tenant?.id,
      p_plan_code: planCode,
      p_trial_days: subscription ? 0 : 14, // 14j essai si premiere fois, 0 sinon
    });
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-subscription', tenant?.id] });
    toast.success('Plan mis a jour avec succes');
  },
  onError: (error) => {
    console.error('Error changing plan:', error);
    toast.error('Erreur lors du changement de plan');
  },
});
```

### Correction 3 : Supprimer le state inutile showUpgradeDialog

Le bouton "Changer de plan" peut simplement scroller vers la section des plans disponibles ou etre supprime puisque les plans sont deja visibles en dessous.

Option retenue : Garder le bouton mais le faire scroller vers les plans.

---

## Fichier modifie

`src/components/settings/TenantBillingSettings.tsx`

### Modifications detaillees

| Ligne | Avant | Apres |
|-------|-------|-------|
| 267 | `const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);` | Supprimer (inutile) |
| 492 | `onClick={() => setShowUpgradeDialog(true)}` | `onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}` |
| 504 | `<div>` | `<div id="available-plans">` |
| 506 | `<div className="grid gap-4 ...">` | `<div className="grid gap-4 ... items-stretch">` |
| 510 | `<Card key={plan.id} className={isCurrent ? 'border-primary' : ''}>` | `<Card key={plan.id} className={\`flex flex-col ${isCurrent ? 'border-primary' : ''}\`}>` |
| 517 | `<CardContent>` | `<CardContent className="flex-1">` |
| 523-530 | Rendu conditionnel | Toujours render avec logique interne |

### Ajout de la mutation

Apres ligne 388 (apres `deletePaymentMethodMutation`), ajouter :

```typescript
// Select/change plan mutation
const selectPlanMutation = useMutation({
  mutationFn: async (planCode: string) => {
    const { data, error } = await supabase.rpc('create_tenant_subscription', {
      p_tenant_id: tenant?.id,
      p_plan_code: planCode,
      p_trial_days: subscription ? 0 : 14,
    });
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['tenant-subscription', tenant?.id] });
    toast.success(subscription ? 'Plan modifie avec succes' : 'Abonnement cree avec essai de 14 jours');
  },
  onError: (error) => {
    console.error('Error changing plan:', error);
    toast.error('Erreur lors du changement de plan');
  },
});
```

### CardFooter final

```typescript
<CardFooter className="mt-auto pt-4">
  {isCurrent ? (
    <Badge className="w-full justify-center h-9">Plan actuel</Badge>
  ) : (
    <Button 
      variant="outline" 
      className="w-full" 
      size="sm" 
      onClick={() => selectPlanMutation.mutate(plan.code)}
      disabled={selectPlanMutation.isPending}
    >
      {selectPlanMutation.isPending ? 'Selection...' : 'Selectionner'}
    </Button>
  )}
</CardFooter>
```

---

## Resume des actions

1. Ajouter `flex flex-col` aux cards de plans pour uniformiser les hauteurs
2. Ajouter `items-stretch` a la grille pour etirer les cards
3. Ajouter `flex-1` au CardContent pour occuper l'espace disponible
4. Ajouter `mt-auto` au CardFooter pour aligner les boutons en bas
5. Creer `selectPlanMutation` pour appeler `create_tenant_subscription` RPC
6. Connecter le bouton "Selectionner" a la mutation
7. Gerer le cas "pas de subscription" avec 14 jours d'essai
8. Supprimer le state `showUpgradeDialog` inutilise
9. Faire scroller le bouton "Changer de plan" vers les plans disponibles

