import { useState } from "react";
import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useUpdatePurchaseOrder, useChangePOStatus } from "@/hooks/usePurchaseOrders";
import { useToast } from "@/hooks/use-toast";

const CARRIERS = [
  { value: "dhl", label: "DHL" },
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "colissimo", label: "Colissimo" },
  { value: "la_poste", label: "La Poste" },
  { value: "chronopost", label: "Chronopost" },
  { value: "other", label: "Autre" },
];

interface POTrackingModalProps {
  open: boolean;
  onClose: () => void;
  poId: string;
}

export function POTrackingModal({ open, onClose, poId }: POTrackingModalProps) {
  const updatePO = useUpdatePurchaseOrder();
  const changeStatus = useChangePOStatus();
  const { toast } = useToast();

  const [carrier, setCarrier] = useState("dhl");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [shippedAt, setShippedAt] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!trackingNumber.trim()) {
      toast({
        title: "Erreur",
        description: "Le numéro de suivi est requis",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update tracking info
      await updatePO.mutateAsync({
        id: poId,
        carrier,
        tracking_number: trackingNumber.trim(),
        shipped_at: new Date(shippedAt).toISOString(),
      });

      // Change status to in_transit
      await changeStatus.mutateAsync({
        id: poId,
        status: "in_transit",
        reason: `Expédié via ${CARRIERS.find(c => c.value === carrier)?.label || carrier}`,
      });

      toast({
        title: "Suivi ajouté",
        description: "La commande est maintenant en transit",
      });

      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTrackingNumber("");
      setCarrier("dhl");
      setShippedAt(new Date().toISOString().split("T")[0]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Ajouter le suivi d'expédition
          </DialogTitle>
          <DialogDescription>
            Renseignez les informations de suivi pour cette commande fournisseur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="carrier">Transporteur</Label>
            <select
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
            >
              {CARRIERS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking_number">Numéro de suivi</Label>
            <Input
              id="tracking_number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="ex: 1Z999AA10123456784"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipped_at">Date d'expédition</Label>
            <Input
              id="shipped_at"
              type="date"
              value={shippedAt}
              onChange={(e) => setShippedAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Confirmer l'expédition"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
