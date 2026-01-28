import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { getStripePaymentService } from '@/services/payment/StripePaymentService';

// Initialize Stripe with publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface PaymentCardFormProps {
  tenantId: string;
  planCode?: string;
  planName?: string;
  planPrice?: number;
  isTrialEligible?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Inner form component that uses Stripe hooks
function CardFormInner({
  tenantId,
  planCode,
  planName,
  planPrice,
  isTrialEligible,
  onSuccess,
  onCancel,
  clientSecret,
}: PaymentCardFormProps & { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Confirm the SetupIntent to save the payment method
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (setupError) {
        throw new Error(setupError.message);
      }

      if (!setupIntent?.payment_method) {
        throw new Error('No payment method created');
      }

      const paymentMethodId = typeof setupIntent.payment_method === 'string' 
        ? setupIntent.payment_method 
        : setupIntent.payment_method.id;

      // If a plan is selected, create the subscription
      if (planCode) {
        const paymentService = getStripePaymentService();
        const result = await paymentService.createSubscription(
          tenantId,
          planCode,
          paymentMethodId,
          isTrialEligible ? 14 : 0
        );

        // If subscription requires additional authentication
        if (result.clientSecret) {
          const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret);
          if (confirmError) {
            throw new Error(confirmError.message);
          }
        }

        toast.success(
          isTrialEligible 
            ? 'Abonnement activé avec 14 jours d\'essai gratuit !' 
            : 'Abonnement activé avec succès !'
        );
      } else {
        toast.success('Carte enregistrée avec succès');
      }

      onSuccess?.();
    } catch (err) {
      console.error('Payment error:', err);
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: 'hsl(var(--foreground))',
        fontFamily: 'Inter, system-ui, sans-serif',
        '::placeholder': {
          color: 'hsl(var(--muted-foreground))',
        },
      },
      invalid: {
        color: 'hsl(var(--destructive))',
      },
    },
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Paiement par carte
          </CardTitle>
          <CardDescription>
            {planCode && planName ? (
              <>Abonnement {planName} — {planPrice?.toLocaleString('fr-FR')}€/mois</>
            ) : (
              'Enregistrez votre carte pour les paiements futurs'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTrialEligible && (
            <Alert className="bg-primary/10 border-primary/20">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                <strong>14 jours d'essai gratuit</strong> — Vous ne serez débité qu'à la fin de la période d'essai.
              </AlertDescription>
            </Alert>
          )}

          <div className="p-4 border rounded-lg bg-background">
            <CardElement 
              options={cardElementOptions}
              onChange={(e) => {
                setCardComplete(e.complete);
                if (e.error) {
                  setError(e.error.message);
                } else {
                  setError(null);
                }
              }}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Paiement sécurisé par Stripe. Vos données sont chiffrées.</span>
          </div>

          <div className="flex gap-3 pt-2">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                disabled={isProcessing}
              >
                Annuler
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!stripe || !cardComplete || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : planCode ? (
                isTrialEligible ? 'Commencer l\'essai gratuit' : 'Souscrire'
              ) : (
                'Enregistrer la carte'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// Main component that handles Stripe Elements initialization
export function PaymentCardForm(props: PaymentCardFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initSetupIntent() {
      try {
        const paymentService = getStripePaymentService();
        const result = await paymentService.createSetupIntent(props.tenantId);
        setClientSecret(result.clientSecret);
      } catch (err) {
        console.error('Error creating setup intent:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'initialisation');
      } finally {
        setLoading(false);
      }
    }

    if (props.tenantId) {
      initSetupIntent();
    }
  }, [props.tenantId]);

  if (!stripePromise) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Configuration Stripe manquante. Veuillez configurer VITE_STRIPE_PUBLISHABLE_KEY.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Chargement du formulaire de paiement...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!clientSecret) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Impossible d'initialiser le paiement</AlertDescription>
      </Alert>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardFormInner {...props} clientSecret={clientSecret} />
    </Elements>
  );
}
