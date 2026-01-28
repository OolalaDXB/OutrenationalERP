// Abstract Payment Service Interface
// This allows switching payment providers (Stripe, Checkout.com, etc.) without changing frontend code

export interface SetupIntentResult {
  clientSecret: string;
  customerId: string;
}

export interface SubscriptionResult {
  subscriptionId: string;
  status: string;
  clientSecret?: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'sepa' | 'crypto';
  last4?: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
}

export interface CancelSubscriptionResult {
  success: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string;
}

export interface PaymentService {
  /**
   * Create a setup intent to save a payment method
   */
  createSetupIntent(tenantId: string): Promise<SetupIntentResult>;

  /**
   * Create a subscription for the given plan
   */
  createSubscription(
    tenantId: string,
    planCode: string,
    paymentMethodId?: string,
    trialDays?: number
  ): Promise<SubscriptionResult>;

  /**
   * Cancel an active subscription
   */
  cancelSubscription(
    tenantId: string,
    cancelAtPeriodEnd?: boolean
  ): Promise<CancelSubscriptionResult>;

  /**
   * Get payment methods on file for a tenant
   */
  getPaymentMethods(tenantId: string): Promise<PaymentMethod[]>;
}

export type PaymentProvider = 'stripe' | 'checkout' | 'adyen';

// Factory to get the current payment service implementation
export function getPaymentService(): PaymentService {
  // Currently only Stripe is implemented
  // Future: check config/env to return different implementations
  const { StripePaymentService } = require('./StripePaymentService');
  return new StripePaymentService();
}
