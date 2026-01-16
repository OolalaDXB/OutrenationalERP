import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, X, ScanLine, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = useCallback(async () => {
    if (!isOpen || scannerRef.current) return;

    try {
      setError(null);
      setIsScanning(true);

      // Dynamic import to avoid SSR issues
      const { Html5Qrcode } = await import("html5-qrcode");
      
      const scannerId = "barcode-scanner-container";
      
      // Ensure the container exists
      if (!document.getElementById(scannerId)) {
        setError("Scanner container not found");
        return;
      }

      const html5Qrcode = new Html5Qrcode(scannerId);
      scannerRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 100 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          // Success callback
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // Error callback - ignore scan errors
        }
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setError(
        err instanceof Error 
          ? err.message.includes("Permission") 
            ? "Accès à la caméra refusé. Veuillez autoriser l'accès."
            : "Impossible de démarrer le scanner."
          : "Erreur inconnue"
      );
      setIsScanning(false);
    }
  }, [isOpen, onScan]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(startScanner, 100);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [isOpen, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/80" onClick={handleClose} />
      <div className="relative bg-card rounded-xl shadow-lg w-full max-w-md mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Scanner un code-barres</h2>
              <p className="text-sm text-muted-foreground">Positionnez le code dans le cadre</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Scanner area */}
        <div className="relative aspect-[4/3] bg-black" ref={containerRef}>
          <div id="barcode-scanner-container" className="w-full h-full" />
          
          {/* Scanning overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-24 border-2 border-primary rounded-lg">
                <ScanLine className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full h-1 text-primary animate-pulse" />
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90">
              <div className="text-center p-6">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button variant="outline" onClick={startScanner}>
                  Réessayer
                </Button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Démarrage de la caméra...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <p className="text-xs text-center text-muted-foreground">
            Scannez un code-barres EAN/UPC pour rechercher le produit
          </p>
        </div>
      </div>
    </div>
  );
}
