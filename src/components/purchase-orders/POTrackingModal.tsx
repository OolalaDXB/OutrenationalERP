import { useState, useMemo } from "react";
import { Loader2, Truck, ExternalLink, Zap, PenLine } from "lucide-react";
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
import { getCarrierTrackingUrl } from "@/lib/carrier-tracking-urls";

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
    customTrackingUrl?: string | null;
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
  const [customTrackingUrl, setCustomTrackingUrl] = useState(existingTracking?.customTrackingUrl || "");
  const [shippedAt, setShippedAt] = useState(() => {
    if (existingTracking?.shippedAt) {
      return existingTracking.shippedAt.split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens with new data
  const isEditing = !!existingTracking?.trackingNumber;
  const isOtherCarrier = carrier === "other";

  // Compute tracking URL preview
  const trackingUrlPreview = useMemo(() => {
    if (!trackingNumber.trim()) return null;
    if (isOtherCarrier && customTrackingUrl.trim()) {
      return customTrackingUrl.trim();
    }
    return getCarrierTrackingUrl(carrier, trackingNumber.trim());
  }, [carrier, trackingNumber, customTrackingUrl, isOtherCarrier]);

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

      // Build the final tracking URL for the toast
      const finalTrackingUrl = isOtherCarrier && customTrackingUrl.trim() 
        ? customTrackingUrl.trim() 
        : getCarrierTrackingUrl(carrier, trackingNumber.trim());

      // Try to create Ship24 tracker only if new tracking (not editing) and not custom carrier
      if (!isEditing && !isOtherCarrier) {
        try {
          await createTracker.mutateAsync({
            trackingNumber: trackingNumber.trim(),
            courierCode: carrier,
            purchaseOrderId: poId,
          });
          toast({
            title: "Suivi ajouté",
            description: (
              <span>
                La commande est en transit.{" "}
                <a 
                  href={finalTrackingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium underline hover:no-underline"
                >
                  Suivre le colis →
                </a>
              </span>
            ),
          });
        } catch (ship24Error) {
          // Ship24 failed but manual tracking still works
          console.warn("Ship24 tracker creation failed:", ship24Error);
          toast({
            title: "Suivi ajouté",
            description: (
              <span>
                La commande est en transit.{" "}
                <a 
                  href={finalTrackingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium underline hover:no-underline"
                >
                  Suivre le colis →
                </a>
              </span>
            ),
          });
        }
      } else {
        toast({
          title: isEditing ? "Suivi modifié" : "Suivi ajouté",
          description: (
            <span>
              {isEditing ? "Les informations de suivi ont été mises à jour." : "La commande est en transit."}{" "}
              <a 
                href={finalTrackingUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium underline hover:no-underline"
              >
                Suivre le colis →
              </a>
            </span>
          ),
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
      setCustomTrackingUrl(existingTracking?.customTrackingUrl || "");
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
            
            {/* Ship24 vs Manual mode indicator */}
            <div className={`mt-2 flex items-center gap-1.5 text-xs ${isOtherCarrier ? 'text-muted-foreground' : 'text-primary'}`}>
              {isOtherCarrier ? (
                <>
                  <PenLine className="w-3.5 h-3.5" />
                  <span>Mode manuel – lien personnalisé</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Suivi automatique Ship24</span>
                </>
              )}
            </div>
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

          {/* Custom URL field for "Autre" carrier */}
          {isOtherCarrier && (
            <div className="space-y-2">
              <Label htmlFor="custom_tracking_url">URL de suivi personnalisée</Label>
              <Input
                id="custom_tracking_url"
                value={customTrackingUrl}
                onChange={(e) => setCustomTrackingUrl(e.target.value)}
                placeholder="https://..."
                type="url"
              />
              <p className="text-xs text-muted-foreground">
                Collez l'URL complète de la page de suivi du transporteur
              </p>
            </div>
          )}

          {/* Live tracking URL preview */}
          {trackingUrlPreview && (
            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Lien de suivi :</p>
              <a
                href={trackingUrlPreview}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1.5 break-all"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{trackingUrlPreview}</span>
              </a>
            </div>
          )}

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
