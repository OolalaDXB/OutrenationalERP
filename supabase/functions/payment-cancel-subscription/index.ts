// Stripe Subscription cancellation using native fetch - no SDK dependencies
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

// Simple Supabase helpers
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
    const { tenant_id, cancel_at_period_end = true } = await req.json();

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id required' }), {
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

    // Get subscription info
    const subscriptions = await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      'tenant_subscriptions',
      { params: { tenant_id: `eq.${tenant_id}`, select: 'stripe_subscription_id' } }
    );

    if (!subscriptions?.[0]?.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        status: 404,
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

    let result;
    if (cancel_at_period_end) {
      result = await stripeRequest(`/subscriptions/${subscriptions[0].stripe_subscription_id}`, 'POST', {
        cancel_at_period_end: 'true',
      }, stripeKey);
      console.log('Subscription set to cancel at period end:', subscriptions[0].stripe_subscription_id);
    } else {
      result = await stripeRequest(`/subscriptions/${subscriptions[0].stripe_subscription_id}`, 'DELETE', null, stripeKey);
      console.log('Subscription canceled immediately:', subscriptions[0].stripe_subscription_id);
    }

    // Update local record
    await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      `tenant_subscriptions?tenant_id=eq.${tenant_id}`,
      {
        method: 'PATCH',
        body: {
          status: cancel_at_period_end ? 'active' : 'canceled',
          cancel_at_period_end,
          canceled_at: cancel_at_period_end ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }
    );

    return new Response(JSON.stringify({
      success: true,
      cancel_at_period_end,
      current_period_end: result.current_period_end 
        ? new Date(result.current_period_end * 1000).toISOString() 
        : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Error canceling subscription:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
