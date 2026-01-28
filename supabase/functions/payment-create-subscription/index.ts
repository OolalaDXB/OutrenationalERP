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

    const { tenant_id, plan_code, payment_method_id, trial_days = 0 } = await req.json();
    
    if (!tenant_id || !plan_code) {
      return new Response(JSON.stringify({ error: 'tenant_id and plan_code required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has admin access to tenant
    const { data: tenantAccess } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!tenantAccess || tenantAccess.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden - admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get plan details from database
    const { data: plan, error: planError } = await supabase
      .from('sillon_plans')
      .select('*')
      .eq('code', plan_code)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get existing subscription to get Stripe customer ID
    const { data: existingSub } = await supabase
      .from('tenant_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (!existingSub?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No payment method on file. Please add a card first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerId = existingSub.stripe_customer_id;

    // Set default payment method if provided
    if (payment_method_id) {
      await stripeRequest(`/customers/${customerId}`, 'POST', {
        'invoice_settings[default_payment_method]': payment_method_id,
      }, stripeKey);
    }

    // Search for existing Stripe Product
    const productsSearch = await stripeRequest(`/products/search?query=metadata['plan_code']:'${plan_code}'`, 'GET', null, stripeKey);
    
    let stripeProductId: string;
    if (productsSearch.data && productsSearch.data.length > 0) {
      stripeProductId = productsSearch.data[0].id;
    } else {
      // Create new product
      const newProduct = await stripeRequest('/products', 'POST', {
        name: `Sillon ${plan.name}`,
        description: plan.description || `Plan ${plan.name}`,
        'metadata[plan_code]': plan.code,
      }, stripeKey);
      stripeProductId = newProduct.id;
    }

    // Create dynamic price based on sillon_plans table
    const priceAmount = Math.round(plan.base_price_monthly * 100); // Convert to cents
    
    const stripePrice = await stripeRequest('/prices', 'POST', {
      product: stripeProductId,
      unit_amount: priceAmount.toString(),
      currency: 'eur',
      'recurring[interval]': 'month',
      'metadata[plan_code]': plan.code,
      'metadata[plan_version]': plan.version,
    }, stripeKey);

    console.log('Created dynamic Stripe price:', stripePrice.id, 'for plan:', plan_code, 'amount:', priceAmount);

    // Cancel existing subscription if exists
    if (existingSub?.stripe_subscription_id) {
      try {
        await stripeRequest(`/subscriptions/${existingSub.stripe_subscription_id}`, 'DELETE', null, stripeKey);
        console.log('Cancelled existing subscription:', existingSub.stripe_subscription_id);
      } catch (err) {
        console.warn('Could not cancel existing subscription:', err);
      }
    }

    // Create new subscription
    const subscriptionParams: Record<string, string> = {
      customer: customerId,
      'items[0][price]': stripePrice.id,
      'metadata[tenant_id]': tenant_id,
      'metadata[plan_code]': plan.code,
      'expand[]': 'latest_invoice.payment_intent',
    };

    // Add trial if requested
    if (trial_days > 0) {
      subscriptionParams['trial_period_days'] = trial_days.toString();
    }

    const stripeSubscription = await stripeRequest('/subscriptions', 'POST', subscriptionParams, stripeKey);

    console.log('Created Stripe subscription:', stripeSubscription.id, 'status:', stripeSubscription.status);

    // Update tenant_subscriptions in database
    const { error: updateError } = await supabase
      .from('tenant_subscriptions')
      .update({
        plan_code: plan.code,
        plan_version: plan.version,
        stripe_subscription_id: stripeSubscription.id,
        stripe_price_id: stripePrice.id,
        status: stripeSubscription.status === 'trialing' ? 'trialing' : 'active',
        base_price: plan.base_price_monthly,
        monthly_total: plan.base_price_monthly,
        payment_provider: 'stripe',
        trial_ends_at: stripeSubscription.trial_end 
          ? new Date(stripeSubscription.trial_end * 1000).toISOString() 
          : null,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenant_id);

    if (updateError) {
      console.error('Error updating subscription in DB:', updateError);
    }

    // Also update tenant plan_code
    await supabase
      .from('tenants')
      .update({ 
        plan_code: plan.code, 
        plan_version: plan.version,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenant_id);

    return new Response(JSON.stringify({
      subscription_id: stripeSubscription.id,
      status: stripeSubscription.status,
      client_secret: stripeSubscription.latest_invoice?.payment_intent?.client_secret,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Error creating subscription:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
