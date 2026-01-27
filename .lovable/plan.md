
# Plan de correction : Changement de plan avec bouton de sauvegarde

## Probleme identifie

Le fichier `TenantDetail.tsx` actuel (lignes 370-378) applique le changement de plan **immediatement** lors de la selection dans le dropdown via `onValueChange={(v) => assignPlanMutation.mutate(v)}`. 

Cela pose deux problemes :
1. Aucun feedback utilisateur sur le changement en attente
2. Pas de confirmation avant sauvegarde

## Solution

Refactorer la section "Changer le plan" pour utiliser un **state local** + **bouton de sauvegarde explicite**, comme le modele de discount qui fonctionne deja.

## Modifications a effectuer

### 1. Ajouter un state pour le plan selectionne

```typescript
const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
```

Initialise a `null` pour detecter si l'utilisateur a fait un changement.

### 2. Modifier le Select du plan

Remplacer :
```typescript
<Select value={tenant.plan_code || ''} onValueChange={(v) => assignPlanMutation.mutate(v)}>
```

Par :
```typescript
<Select 
  value={selectedPlanCode ?? tenant.plan_code ?? ''} 
  onValueChange={setSelectedPlanCode}
  disabled={!can('canAssignPlan')}
>
```

### 3. Ajouter un bouton de sauvegarde

Ajouter un bouton "Enregistrer le plan" visible uniquement si `selectedPlanCode` differe du plan actuel :

```typescript
{selectedPlanCode && selectedPlanCode !== tenant.plan_code && (
  <Button 
    onClick={() => {
      assignPlanMutation.mutate(selectedPlanCode);
      setSelectedPlanCode(null);
    }}
    disabled={assignPlanMutation.isPending}
  >
    {assignPlanMutation.isPending ? 'Enregistrement...' : 'Enregistrer le plan'}
  </Button>
)}
```

### 4. Reset du state apres succes

Dans le callback `onSuccess` de `assignPlanMutation`, ajouter `setSelectedPlanCode(null)` pour reinitialiser l'etat.

## Structure finale de la Card "Changer le plan"

```text
+------------------------------------+
| Changer le plan                    |
+------------------------------------+
| [Dropdown: Pro - 149/mois    v]    |
|                                    |
| [Enregistrer le plan]  <- visible  |
|   si selection differente          |
+------------------------------------+
```

## Fichier modifie

- `src/pages/admin/TenantDetail.tsx`
  - Ajout du state `selectedPlanCode`
  - Modification du Select (ligne ~372)
  - Ajout du bouton de sauvegarde
  - Reset du state dans `onSuccess`

## Bonus : coherence globale

Ce pattern peut etre etendu aux autres parametres (database dediee, etc.) si souhaite, mais la priorite est le changement de plan.
