// Stripe Setup Intent creation using native fetch - no SDK dependencies
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

// Simple Supabase client using fetch
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
      'Prefer': options.method === 'POST' ? 'return=representation' : 'return=minimal',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok) {
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
  
  if (!response.ok) {
    return null;
  }
  return response.json();
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

    // Verify user
    const user = await getUser(supabaseUrl, supabaseAnonKey, token);
    if (!user?.id) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const userEmail = user.email || '';

    // Get tenant_id from request body
    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user has access to tenant
    const tenantAccess = await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      'tenant_users',
      { params: { tenant_id: `eq.${tenant_id}`, user_id: `eq.${userId}`, select: 'role' } }
    );

    if (!tenantAccess?.[0] || !['admin', 'staff'].includes(tenantAccess[0].role)) {
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

    // Get existing subscription to check for Stripe customer
    const subscriptions = await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      'tenant_subscriptions',
      { params: { tenant_id: `eq.${tenant_id}`, select: 'stripe_customer_id' } }
    );

    let stripeCustomerId = subscriptions?.[0]?.stripe_customer_id;

    if (!stripeCustomerId) {
      // Get tenant info for customer creation
      const tenants = await supabaseQuery(
        supabaseUrl, supabaseAnonKey, authHeader,
        'tenants',
        { params: { id: `eq.${tenant_id}`, select: 'name' } }
      );

      // Create Stripe customer
      const customer = await stripeRequest('/customers', 'POST', {
        email: userEmail,
        name: tenants?.[0]?.name || 'Tenant',
        'metadata[tenant_id]': tenant_id,
        'metadata[created_by]': userId,
      }, stripeKey);
      
      stripeCustomerId = customer.id;

      // Store customer ID in subscription (upsert)
      await supabaseQuery(
        supabaseUrl, supabaseAnonKey, authHeader,
        'tenant_subscriptions',
        {
          method: 'POST',
          body: {
            tenant_id,
            stripe_customer_id: stripeCustomerId,
            plan_code: 'free',
            plan_version: '2024-01',
            status: 'incomplete',
            base_price: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }
      );
    }

    // Create SetupIntent
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
