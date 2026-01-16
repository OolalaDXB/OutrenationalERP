// Supabase error mapping for user-friendly messages

export interface ParsedSupabaseError {
  userMessage: string;
  isStockError: boolean;
}

export function parseSupabaseError(error: unknown): ParsedSupabaseError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = JSON.stringify(error).toLowerCase() + errorMessage.toLowerCase();

  // Direct stock update forbidden (trigger protection)
  if (errorString.includes('direct stock updates are forbidden')) {
    return {
      userMessage: "Le stock est géré automatiquement. Modifiez les articles de commande à la place.",
      isStockError: true
    };
  }

  // Insufficient stock
  if (errorString.includes('insufficient stock') || errorString.includes('stock insuffisant')) {
    return {
      userMessage: "Stock insuffisant pour cette quantité.",
      isStockError: true
    };
  }

  // CHECK constraint on quantity
  if (errorString.includes('check') && (errorString.includes('quantity') || errorString.includes('quantit'))) {
    return {
      userMessage: "La quantité doit être d'au moins 1.",
      isStockError: false
    };
  }

  // Positive quantity check
  if (errorString.includes('quantity must be positive') || errorString.includes('quantité positive')) {
    return {
      userMessage: "La quantité doit être supérieure à 0.",
      isStockError: false
    };
  }

  // Foreign key constraint
  if (errorString.includes('foreign key') || errorString.includes('fkey')) {
    return {
      userMessage: "Référence invalide. Le produit ou la commande n'existe pas.",
      isStockError: false
    };
  }

  // Unique constraint
  if (errorString.includes('unique') || errorString.includes('duplicate')) {
    return {
      userMessage: "Cet enregistrement existe déjà.",
      isStockError: false
    };
  }

  // RLS policy violation
  if (errorString.includes('row-level security') || errorString.includes('rls')) {
    return {
      userMessage: "Vous n'avez pas les permissions pour effectuer cette action.",
      isStockError: false
    };
  }

  // Default error
  return {
    userMessage: "Une erreur est survenue. Veuillez réessayer.",
    isStockError: false
  };
}

// Toast helper for consistent error display
export function getErrorToast(error: unknown): { title: string; description: string; variant: "destructive" } {
  const parsed = parseSupabaseError(error);
  return {
    title: parsed.isStockError ? "Erreur de stock" : "Erreur",
    description: parsed.userMessage,
    variant: "destructive" as const
  };
}
