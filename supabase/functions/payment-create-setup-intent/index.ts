import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Stripe API helper using fetch (no SDK needed - avoids Deno compatibility issues)
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

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email || '';

    // Get tenant_id from request body
    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to tenant
    const { data: tenantAccess } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!tenantAccess || !['admin', 'staff'].includes(tenantAccess.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Stripe customer for this tenant
    const { data: subscription } = await supabase
      .from('tenant_subscriptions')
      .select('stripe_customer_id')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    let stripeCustomerId = subscription?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Get tenant info for customer creation
      const { data: tenant } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenant_id)
        .single();

      // Create Stripe customer using REST API
      const customer = await stripeRequest('/customers', 'POST', {
        email: userEmail,
        name: tenant?.name || 'Tenant',
        'metadata[tenant_id]': tenant_id,
        'metadata[created_by]': userId,
      }, stripeKey);
      
      stripeCustomerId = customer.id;

      // Store customer ID in subscription (create if not exists)
      await supabase
        .from('tenant_subscriptions')
        .upsert({
          tenant_id,
          stripe_customer_id: stripeCustomerId,
          plan_code: 'free',
          plan_version: '2024-01',
          status: 'incomplete',
          base_price: 0,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'tenant_id' });
    }

    // Create SetupIntent using REST API
    const setupIntent = await stripeRequest('/setup_intents', 'POST', {
      customer: stripeCustomerId,
      'payment_method_types[]': 'card',
      'metadata[tenant_id]': tenant_id,
    }, stripeKey);

    console.log('SetupIntent created:', setupIntent.id, 'for tenant:', tenant_id);

    return new Response(JSON.stringify({
      client_secret: setupIntent.client_secret,
      customer_id: stripeCustomerId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Error creating setup intent:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
