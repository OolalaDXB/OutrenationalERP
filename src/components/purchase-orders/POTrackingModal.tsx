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
import { useCreateShip24Tracker } from "@/hooks/useShip24Tracking";
import { useToast } from "@/hooks/use-toast";

const CARRIERS = [
  { value: "dhl", label: "DHL" },
  { value: "fedex", label: "FedEx" },
  { value: "ups", label: "UPS" },
  { value: "colissimo", label: "Colissimo" },
  { value: "la_poste", label: "La Poste" },
  { value: "chronopost", label: "Chronopost" },
  { value: "tnt", label: "TNT" },
  { value: "gls", label: "GLS" },
  { value: "mondial_relay", label: "Mondial Relay" },
  { value: "dpd", label: "DPD" },
  { value: "other", label: "Autre" },
];

interface POTrackingModalProps {
  open: boolean;
  onClose: () => void;
  poId: string;
  existingTracking?: {
    carrier?: string | null;
    trackingNumber?: string | null;
    shippedAt?: string | null;
  };
  currentStatus?: string;
}

export function POTrackingModal({ open, onClose, poId, existingTracking, currentStatus }: POTrackingModalProps) {
  const updatePO = useUpdatePurchaseOrder();
  const changeStatus = useChangePOStatus();
  const createTracker = useCreateShip24Tracker();
  const { toast } = useToast();

  const [carrier, setCarrier] = useState(existingTracking?.carrier || "dhl");
  const [trackingNumber, setTrackingNumber] = useState(existingTracking?.trackingNumber || "");
  const [shippedAt, setShippedAt] = useState(() => {
    if (existingTracking?.shippedAt) {
      return existingTracking.shippedAt.split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens with new data
  const isEditing = !!existingTracking?.trackingNumber;

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

      // Only change status to in_transit if not already in_transit or beyond
      const needsStatusChange = currentStatus && !['in_transit', 'partially_received', 'received', 'closed'].includes(currentStatus);
      
      if (needsStatusChange) {
        await changeStatus.mutateAsync({
          id: poId,
          status: "in_transit",
          reason: `Expédié via ${CARRIERS.find(c => c.value === carrier)?.label || carrier}`,
        });
      }

      // Try to create Ship24 tracker only if new tracking (not editing)
      if (!isEditing) {
        try {
          await createTracker.mutateAsync({
            trackingNumber: trackingNumber.trim(),
            courierCode: carrier,
            purchaseOrderId: poId,
          });
          toast({
            title: "Suivi ajouté",
            description: "La commande est en transit. Le suivi automatique Ship24 est activé.",
          });
        } catch (ship24Error) {
          // Ship24 failed but manual tracking still works
          console.warn("Ship24 tracker creation failed:", ship24Error);
          toast({
            title: "Suivi ajouté",
            description: "La commande est en transit. (Suivi automatique non disponible)",
          });
        }
      } else {
        toast({
          title: "Suivi modifié",
          description: "Les informations de suivi ont été mises à jour.",
        });
      }

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
      // Reset to initial values (or existing tracking data)
      setTrackingNumber(existingTracking?.trackingNumber || "");
      setCarrier(existingTracking?.carrier || "dhl");
      setShippedAt(existingTracking?.shippedAt?.split("T")[0] || new Date().toISOString().split("T")[0]);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            {isEditing ? "Modifier le suivi d'expédition" : "Ajouter le suivi d'expédition"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Modifiez les informations de suivi pour cette commande fournisseur."
              : "Renseignez les informations de suivi pour cette commande fournisseur."}
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
              isEditing ? "Enregistrer les modifications" : "Confirmer l'expédition"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
