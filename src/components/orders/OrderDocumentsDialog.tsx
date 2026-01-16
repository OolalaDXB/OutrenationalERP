import { useState } from "react";
import { FileText, Truck, Download, Eye, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "@/hooks/use-toast";
import type { Order, OrderItem } from "@/hooks/useOrders";
import { 
  generateOrderInvoicePDF, 
  downloadOrderInvoice, 
  previewOrderInvoice 
} from "./OrderInvoicePDF";
import { 
  generateShippingSlipPDF, 
  downloadShippingSlip, 
  previewShippingSlip 
} from "./ShippingSlipPDF";

type OrderWithItems = Order & { order_items?: OrderItem[] };

interface OrderDocumentsDialogProps {
  order: OrderWithItems;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderDocumentsDialog({ order, isOpen, onClose }: OrderDocumentsDialogProps) {
  const { data: settings } = useSettings();
  const [activeTab, setActiveTab] = useState<"invoice" | "shipping">("invoice");
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleGenerateInvoice = async (download: boolean = false) => {
    if (!settings) {
      toast({ title: "Erreur", description: "Paramètres non chargés", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const doc = await generateOrderInvoicePDF({ 
        order, 
        settings,
        invoiceNumber: order.order_number 
      });
      
      if (download) {
        downloadOrderInvoice(doc, order.order_number);
        toast({ title: "Facture téléchargée", description: `Facture-${order.order_number}.pdf` });
      } else {
        const url = previewOrderInvoice(doc);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({ title: "Erreur", description: "Impossible de générer la facture", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateShippingSlip = async (download: boolean = false) => {
    if (!settings) {
      toast({ title: "Erreur", description: "Paramètres non chargés", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const doc = await generateShippingSlipPDF({ order, settings });
      
      if (download) {
        downloadShippingSlip(doc, order.order_number);
        toast({ title: "Bordereau téléchargé", description: `Bordereau-${order.order_number}.pdf` });
      } else {
        const url = previewShippingSlip(doc);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error("Error generating shipping slip:", error);
      toast({ title: "Erreur", description: "Impossible de générer le bordereau", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "invoice" | "shipping");
    setPreviewUrl(null);
  };

  const handlePreview = () => {
    if (activeTab === "invoice") {
      handleGenerateInvoice(false);
    } else {
      handleGenerateShippingSlip(false);
    }
  };

  const handleDownload = () => {
    if (activeTab === "invoice") {
      handleGenerateInvoice(true);
    } else {
      handleGenerateShippingSlip(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents de la commande {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invoice" className="gap-2">
              <FileText className="w-4 h-4" />
              Facture
            </TabsTrigger>
            <TabsTrigger value="shipping" className="gap-2">
              <Truck className="w-4 h-4" />
              Bordereau d'expédition
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 flex flex-col min-h-0 mt-4">
            <TabsContent value="invoice" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Générez et téléchargez la facture de cette commande avec votre logo et vos informations.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handlePreview}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Aperçu
                  </Button>
                  <Button 
                    onClick={handleDownload}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Télécharger
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shipping" className="flex-1 flex flex-col min-h-0 m-0">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Générez un bordereau d'expédition avec la liste des articles à envoyer.
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handlePreview}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Aperçu
                  </Button>
                  <Button 
                    onClick={handleDownload}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Télécharger
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Preview iframe */}
            {previewUrl && (
              <div className="flex-1 relative border border-border rounded-lg overflow-hidden min-h-[400px]">
                <button
                  onClick={() => setPreviewUrl(null)}
                  className="absolute top-2 right-2 z-10 p-1 rounded-full bg-background/80 hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[400px]"
                  title="Document preview"
                />
              </div>
            )}

            {!previewUrl && (
              <div className="flex-1 flex items-center justify-center bg-secondary/30 rounded-lg min-h-[400px]">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Cliquez sur "Aperçu" pour visualiser le document</p>
                </div>
              </div>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
