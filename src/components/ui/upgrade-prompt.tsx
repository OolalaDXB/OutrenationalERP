import { Lock, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  capability: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Display when a CAPABILITY_REQUIRED error is caught.
 * Shows a neutral message without pricing or plan names.
 */
export function UpgradePrompt({ capability, open, onClose }: UpgradePromptProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <DialogTitle>Fonctionnalité non disponible</DialogTitle>
          <DialogDescription className="text-center">
            Cette fonctionnalité nécessite une mise à niveau de votre abonnement.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={onClose} className="w-full">
            Contacter l'administrateur
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
