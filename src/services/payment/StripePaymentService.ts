import { supabase } from '@/integrations/supabase/client';
import type { 
  PaymentService, 
  SetupIntentResult, 
  SubscriptionResult, 
  CancelSubscriptionResult,
  PaymentMethod 
} from './PaymentService';

export class StripePaymentService implements PaymentService {
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    return session.access_token;
  }

  async createSetupIntent(tenantId: string): Promise<SetupIntentResult> {
    const token = await this.getAuthToken();
    
    const response = await supabase.functions.invoke('payment-create-setup-intent', {
      body: { tenant_id: tenantId },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to create setup intent');
    }

    return {
      clientSecret: response.data.client_secret,
      customerId: response.data.customer_id,
    };
  }

  async savePaymentMethod(tenantId: string, paymentMethodId: string): Promise<{ success: boolean; label?: string }> {
    const token = await this.getAuthToken();
    
    const response = await supabase.functions.invoke('payment-save-method', {
      body: { tenant_id: tenantId, payment_method_id: paymentMethodId },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to save payment method');
    }

    return {
      success: response.data.success,
      label: response.data.label,
    };
  }

  async createSubscription(
    tenantId: string,
    planCode: string,
    paymentMethodId?: string,
    trialDays = 0
  ): Promise<SubscriptionResult> {
    const token = await this.getAuthToken();

    const response = await supabase.functions.invoke('payment-create-subscription', {
      body: { 
        tenant_id: tenantId, 
        plan_code: planCode,
        payment_method_id: paymentMethodId,
        trial_days: trialDays,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to create subscription');
    }

    return {
      subscriptionId: response.data.subscription_id,
      status: response.data.status,
      clientSecret: response.data.client_secret,
    };
  }

  async cancelSubscription(
    tenantId: string,
    cancelAtPeriodEnd = true
  ): Promise<CancelSubscriptionResult> {
    const token = await this.getAuthToken();

    const response = await supabase.functions.invoke('payment-cancel-subscription', {
      body: { 
        tenant_id: tenantId,
        cancel_at_period_end: cancelAtPeriodEnd,
      },
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.error) {
      throw new Error(response.error.message || 'Failed to cancel subscription');
    }

    return {
      success: response.data.success,
      cancelAtPeriodEnd: response.data.cancel_at_period_end,
      currentPeriodEnd: response.data.current_period_end,
    };
  }

  async getPaymentMethods(tenantId: string): Promise<PaymentMethod[]> {
    // For now, return from local tenant_payment_methods table
    // In full implementation, could also query Stripe directly
    const { data, error } = await supabase
      .from('tenant_payment_methods')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) throw error;

    return (data || []).map(pm => ({
      id: pm.id,
      type: pm.type?.includes('card') ? 'card' as const : pm.type?.includes('sepa') ? 'sepa' as const : 'crypto' as const,
      last4: pm.stripe_card_last4 || pm.bank_iban_last4,
      brand: pm.stripe_card_brand,
      expMonth: pm.stripe_card_exp_month,
      expYear: pm.stripe_card_exp_year,
      isDefault: pm.is_default || false,
    }));
  }
}

// Singleton instance
let stripeServiceInstance: StripePaymentService | null = null;

export function getStripePaymentService(): StripePaymentService {
  if (!stripeServiceInstance) {
    stripeServiceInstance = new StripePaymentService();
  }
  return stripeServiceInstance;
}
