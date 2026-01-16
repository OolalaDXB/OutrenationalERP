import { useState, useEffect } from 'react';
import { RefreshCw, Info, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { cn } from '@/lib/utils';

interface CurrencyExchangeFieldProps {
  currency: string;
  exchangeRate: number;
  onExchangeRateChange: (rate: number) => void;
  purchasePrice: number | null;
  className?: string;
}

export function CurrencyExchangeField({
  currency,
  exchangeRate,
  onExchangeRateChange,
  purchasePrice,
  className
}: CurrencyExchangeFieldProps) {
  const { rates, isLoading, refreshRates, lastUpdated, isFallback } = useExchangeRates();
  const [isManualMode, setIsManualMode] = useState(false);

  // Auto-update rate when currency changes to USD (if not in manual mode)
  useEffect(() => {
    if (currency === 'USD' && !isManualMode) {
      onExchangeRateChange(rates.USD_EUR);
    }
  }, [currency, rates.USD_EUR, isManualMode, onExchangeRateChange]);

  // Only show for USD currency
  if (currency !== 'USD') {
    return null;
  }

  const handleRefresh = async () => {
    setIsManualMode(false);
    await refreshRates();
  };

  const handleManualChange = (value: number) => {
    setIsManualMode(true);
    onExchangeRateChange(value);
  };

  const handleResetToAuto = () => {
    setIsManualMode(false);
    onExchangeRateChange(rates.USD_EUR);
  };

  const convertedPrice = purchasePrice ? (purchasePrice * exchangeRate).toFixed(2) : '0.00';

  return (
    <div className={cn("space-y-3 p-4 rounded-lg bg-muted/50 border border-border", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          Taux de change USD → EUR
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Le taux est mis à jour automatiquement via l'API Frankfurter. Vous pouvez le modifier manuellement si nécessaire.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <div className="flex items-center gap-2">
          {isManualMode ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToAuto}
              className="h-7 text-xs"
            >
              <Unlock className="w-3 h-3 mr-1" />
              Auto
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Auto
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-7 w-7"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="relative">
            <Input
              type="number"
              min="0"
              step="0.0001"
              value={exchangeRate}
              onChange={(e) => handleManualChange(Number(e.target.value))}
              className={cn(
                "pr-16",
                isManualMode && "border-primary/50 bg-primary/5"
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
              EUR/USD
            </span>
          </div>
        </div>
      </div>

      {/* Conversion preview */}
      {purchasePrice && purchasePrice > 0 && (
        <div className="text-sm text-muted-foreground bg-background/50 px-3 py-2 rounded-md">
          <span className="font-medium">${purchasePrice.toFixed(2)}</span>
          <span className="mx-2">→</span>
          <span className="font-medium text-foreground">€{convertedPrice}</span>
        </div>
      )}

      {/* Status info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isFallback ? (
            <span className="text-amber-500">Taux approximatif</span>
          ) : (
            <span>Taux actuel: 1 USD = {rates.USD_EUR.toFixed(4)} EUR</span>
          )}
        </span>
        {lastUpdated && (
          <span>
            Màj: {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
