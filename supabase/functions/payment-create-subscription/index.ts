// Stripe Subscription creation using native fetch - no SDK dependencies
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

// Simple Supabase helpers using fetch
async function supabaseQuery(
  url: string,
  anonKey: string,
  authHeader: string,
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {}
) {
  const queryString = options.params ? '?' + new URLSearchParams(options.params).toString() : '';
  const response = await fetch(`${url}/rest/v1/${path}${queryString}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': authHeader,
      'apikey': anonKey,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'PATCH' ? 'return=minimal' : 'return=representation',
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

async function getUser(url: string, anonKey: string, token: string) {
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': anonKey,
    },
  });
  return response.ok ? response.json() : null;
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const token = authHeader.replace('Bearer ', '');

    const user = await getUser(supabaseUrl, supabaseAnonKey, token);
    if (!user?.id) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const { tenant_id, plan_code, payment_method_id, trial_days = 0 } = await req.json();
    
    if (!tenant_id || !plan_code) {
      return new Response(JSON.stringify({ error: 'tenant_id and plan_code required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin access
    const tenantAccess = await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      'tenant_users',
      { params: { tenant_id: `eq.${tenant_id}`, user_id: `eq.${userId}`, select: 'role' } }
    );

    if (!tenantAccess?.[0] || tenantAccess[0].role !== 'admin') {
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

    // Get plan details
    const plans = await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      'sillon_plans',
      { params: { code: `eq.${plan_code}`, is_active: 'eq.true', select: '*' } }
    );

    if (!plans?.[0]) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plan = plans[0];

    // Get existing subscription
    const existingSubs = await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      'tenant_subscriptions',
      { params: { tenant_id: `eq.${tenant_id}`, select: 'stripe_customer_id,stripe_subscription_id' } }
    );

    if (!existingSubs?.[0]?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'No payment method on file. Please add a card first.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const customerId = existingSubs[0].stripe_customer_id;

    // Set default payment method if provided
    if (payment_method_id) {
      await stripeRequest(`/customers/${customerId}`, 'POST', {
        'invoice_settings[default_payment_method]': payment_method_id,
      }, stripeKey);
    }

    // Search for existing product
    const productsSearch = await stripeRequest(
      `/products/search?query=metadata['plan_code']:'${plan_code}'`,
      'GET', null, stripeKey
    );
    
    let stripeProductId: string;
    if (productsSearch.data?.length > 0) {
      stripeProductId = productsSearch.data[0].id;
    } else {
      const newProduct = await stripeRequest('/products', 'POST', {
        name: `Sillon ${plan.name}`,
        description: plan.description || `Plan ${plan.name}`,
        'metadata[plan_code]': plan.code,
      }, stripeKey);
      stripeProductId = newProduct.id;
    }

    // Create price
    const priceAmount = Math.round(plan.base_price_monthly * 100);
    const stripePrice = await stripeRequest('/prices', 'POST', {
      product: stripeProductId,
      unit_amount: priceAmount.toString(),
      currency: 'eur',
      'recurring[interval]': 'month',
      'metadata[plan_code]': plan.code,
      'metadata[plan_version]': plan.version,
    }, stripeKey);

    console.log('Created Stripe price:', stripePrice.id, 'for plan:', plan_code);

    // Cancel existing subscription if exists
    if (existingSubs[0]?.stripe_subscription_id) {
      try {
        await stripeRequest(`/subscriptions/${existingSubs[0].stripe_subscription_id}`, 'DELETE', null, stripeKey);
        console.log('Cancelled existing subscription:', existingSubs[0].stripe_subscription_id);
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

    if (trial_days > 0) {
      subscriptionParams['trial_period_days'] = trial_days.toString();
    }

    const stripeSubscription = await stripeRequest('/subscriptions', 'POST', subscriptionParams, stripeKey);
    console.log('Created Stripe subscription:', stripeSubscription.id, 'status:', stripeSubscription.status);

    // Update tenant_subscriptions
    await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      `tenant_subscriptions?tenant_id=eq.${tenant_id}`,
      {
        method: 'PATCH',
        body: {
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
        },
      }
    );

    // Update tenant plan_code
    await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      `tenants?id=eq.${tenant_id}`,
      {
        method: 'PATCH',
        body: {
          plan_code: plan.code,
          plan_version: plan.version,
          updated_at: new Date().toISOString(),
        },
      }
    );

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
