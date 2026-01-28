// Stripe Webhook handler using native fetch - no SDK dependencies
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

// Simple Supabase helpers using service role key (for webhook operations)
async function supabaseServiceQuery(
  url: string,
  serviceKey: string,
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
) {
  const queryString = options.params ? '?' + new URLSearchParams(options.params).toString() : '';
  const response = await fetch(`${url}/rest/v1/${path}${queryString}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok && response.status !== 404) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// Verify Stripe webhook signature using Web Crypto API
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const elements = signature.split(',');
  let timestamp = '';
  let v1Signature = '';
  
  for (const element of elements) {
    const [key, value] = element.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') v1Signature = value;
  }
  
  if (!timestamp || !v1Signature) {
    return false;
  }
  
  // Check timestamp tolerance (5 minutes)
  const timestampNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampNum) > 300) {
    console.error('Webhook timestamp too old');
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

// Stripe API helper
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!webhookSecret || !stripeKey) {
      console.error('STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Webhook not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.text();
    
    const isValid = await verifyStripeSignature(payload, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(payload);
    console.log('Stripe webhook event:', event.type, event.id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

        await supabaseServiceQuery(
          supabaseUrl, serviceRoleKey,
          `tenant_subscriptions?tenant_id=eq.${tenantId}`,
          {
            method: 'PATCH',
            body: {
              stripe_subscription_id: subscription.id,
              status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              trial_ends_at: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000).toISOString() 
                : null,
              cancel_at_period_end: subscription.cancel_at_period_end || false,
              updated_at: new Date().toISOString(),
            },
          }
        );
        console.log('Updated subscription for tenant:', tenantId, 'status:', status);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const tenantId = subscription.metadata?.tenant_id;
        
        if (tenantId) {
          await supabaseServiceQuery(
            supabaseUrl, serviceRoleKey,
            `tenant_subscriptions?tenant_id=eq.${tenantId}`,
            {
              method: 'PATCH',
              body: {
                status: 'canceled',
                canceled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            }
          );
          
          await supabaseServiceQuery(
            supabaseUrl, serviceRoleKey,
            `tenants?id=eq.${tenantId}`,
            {
              method: 'PATCH',
              body: {
                plan_code: 'free',
                updated_at: new Date().toISOString(),
              },
            }
          );
          console.log('Subscription deleted for tenant:', tenantId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          // Get tenant_id from subscription via Stripe API
          const subscription = await stripeRequest(`/subscriptions/${subscriptionId}`, 'GET', null, stripeKey);
          const tenantId = subscription.metadata?.tenant_id;

          if (tenantId) {
            // Create invoice record
            try {
              await supabaseServiceQuery(
                supabaseUrl, serviceRoleKey,
                'tenant_invoices',
                {
                  method: 'POST',
                  body: {
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
                  },
                }
              );
              console.log('Invoice recorded for tenant:', tenantId, 'amount:', invoice.total / 100);
            } catch (err) {
              console.error('Error creating invoice record:', err);
            }

            // Ensure subscription is active
            await supabaseServiceQuery(
              supabaseUrl, serviceRoleKey,
              `tenant_subscriptions?tenant_id=eq.${tenantId}`,
              {
                method: 'PATCH',
                body: {
                  status: 'active',
                  last_payment_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              }
            );
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
            await supabaseServiceQuery(
              supabaseUrl, serviceRoleKey,
              `tenant_subscriptions?tenant_id=eq.${tenantId}`,
              {
                method: 'PATCH',
                body: {
                  status: 'past_due',
                  updated_at: new Date().toISOString(),
                },
              }
            );
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
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Webhook error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
