import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Stripe webhook signature verification using Web Crypto API
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const elements = signature.split(',');
  const signatureMap: Record<string, string> = {};
  
  for (const element of elements) {
    const [key, value] = element.split('=');
    signatureMap[key] = value;
  }
  
  const timestamp = signatureMap['t'];
  const v1Signature = signatureMap['v1'];
  
  if (!timestamp || !v1Signature) {
    return false;
  }
  
  // Check timestamp is within tolerance (5 minutes)
  const timestampSeconds = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampSeconds) > 300) {
    console.warn('Webhook timestamp too old');
    return false;
  }
  
  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );
  
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === v1Signature;
}

// Stripe API helper using fetch
async function stripeRequest(
  endpoint: string,
  method: string,
  body: Record<string, string> | null,
  stripeKey: string
) {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Stripe API error');
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!stripeKey || !webhookSecret) {
    console.error('Missing Stripe configuration');
    return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing signature' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.text();
    
    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(body);
    console.log('Webhook received:', event.type, event.id);

    // Use service role for webhook operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const tenantId = subscription.metadata?.tenant_id;

        if (!tenantId) {
          console.warn('No tenant_id in subscription metadata:', subscription.id);
          break;
        }

        const status = mapStripeStatus(subscription.status);

        const { error } = await supabase
          .from('tenant_subscriptions')
          .update({
            status,
            stripe_subscription_id: subscription.id,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_ends_at: subscription.trial_end 
              ? new Date(subscription.trial_end * 1000).toISOString() 
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId);

        if (error) {
          console.error('Error updating subscription:', error);
        } else {
          console.log('Updated subscription for tenant:', tenantId, 'status:', status);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const tenantId = subscription.metadata?.tenant_id;

        if (tenantId) {
          await supabase
            .from('tenant_subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', tenantId);

          console.log('Subscription canceled for tenant:', tenantId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          // Get tenant_id from subscription
          const subscription = await stripeRequest(`/subscriptions/${subscriptionId}`, 'GET', null, stripeKey);
          const tenantId = subscription.metadata?.tenant_id;

          if (tenantId) {
            // Create invoice record
            const { error } = await supabase.from('tenant_invoices').insert({
              tenant_id: tenantId,
              stripe_invoice_id: invoice.id,
              invoice_number: invoice.number || `INV-${Date.now()}`,
              issue_date: new Date(invoice.created * 1000).toISOString(),
              due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
              paid_at: invoice.status_transitions?.paid_at 
                ? new Date(invoice.status_transitions.paid_at * 1000).toISOString() 
                : new Date().toISOString(),
              subtotal: (invoice.subtotal || 0) / 100,
              tax_amount: (invoice.tax || 0) / 100,
              total: (invoice.total || 0) / 100,
              currency: invoice.currency?.toUpperCase() || 'EUR',
              status: 'paid',
              pdf_url: invoice.invoice_pdf,
            });

            if (error) {
              console.error('Error creating invoice record:', error);
            } else {
              console.log('Invoice recorded for tenant:', tenantId, 'amount:', invoice.total / 100);
            }

            // Ensure subscription is active
            await supabase
              .from('tenant_subscriptions')
              .update({ 
                status: 'active', 
                last_payment_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('tenant_id', tenantId);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;

        if (subscriptionId) {
          const subscription = await stripeRequest(`/subscriptions/${subscriptionId}`, 'GET', null, stripeKey);
          const tenantId = subscription.metadata?.tenant_id;

          if (tenantId) {
            await supabase
              .from('tenant_subscriptions')
              .update({ 
                status: 'past_due',
                updated_at: new Date().toISOString(),
              })
              .eq('tenant_id', tenantId);

            console.log('Payment failed for tenant:', tenantId);
          }
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook processing error';
    console.error('Webhook error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'canceled',
    paused: 'paused',
  };
  return statusMap[stripeStatus] || 'incomplete';
}
