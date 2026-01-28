// Save payment method after Stripe SetupIntent confirmation
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

    // Get request body
    const { tenant_id, payment_method_id } = await req.json();
    if (!tenant_id || !payment_method_id) {
      return new Response(JSON.stringify({ error: 'tenant_id and payment_method_id required' }), {
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

    // Fetch payment method details from Stripe
    const paymentMethod = await stripeRequest(
      `/payment_methods/${payment_method_id}`,
      'GET',
      null,
      stripeKey
    );

    console.log('Payment method retrieved:', paymentMethod.id, paymentMethod.type);

    if (paymentMethod.type !== 'card') {
      return new Response(JSON.stringify({ error: 'Only card payment methods are supported' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const card = paymentMethod.card;
    const brand = card.brand || 'card';
    const last4 = card.last4;
    const expMonth = card.exp_month;
    const expYear = card.exp_year;

    // Format brand for display
    const brandDisplay = brand.charAt(0).toUpperCase() + brand.slice(1);
    const label = `${brandDisplay} •••• ${last4}`;

    // Check if this is the first payment method (to set as default)
    const existingMethods = await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      'tenant_payment_methods',
      { params: { tenant_id: `eq.${tenant_id}`, is_active: 'eq.true', select: 'id' } }
    );

    const isFirst = !existingMethods || existingMethods.length === 0;

    // Check if this payment method already exists
    const existingPm = await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      'tenant_payment_methods',
      { params: { 
        tenant_id: `eq.${tenant_id}`, 
        stripe_payment_method_id: `eq.${payment_method_id}`,
        select: 'id' 
      }}
    );

    if (existingPm && existingPm.length > 0) {
      console.log('Payment method already exists:', existingPm[0].id);
      return new Response(JSON.stringify({
        success: true,
        payment_method_id: existingPm[0].id,
        message: 'Payment method already saved',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert into tenant_payment_methods
    const newMethod = await supabaseQuery(
      supabaseUrl, supabaseAnonKey, authHeader,
      'tenant_payment_methods',
      {
        method: 'POST',
        body: {
          tenant_id,
          type: 'stripe_card',
          label,
          stripe_payment_method_id: payment_method_id,
          stripe_card_brand: brand,
          stripe_card_last4: last4,
          stripe_card_exp_month: expMonth,
          stripe_card_exp_year: expYear,
          is_default: isFirst,
          is_active: true,
        },
      }
    );

    console.log('Payment method saved:', newMethod?.[0]?.id || 'success');

    return new Response(JSON.stringify({
      success: true,
      payment_method_id: newMethod?.[0]?.id,
      label,
      is_default: isFirst,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('Error saving payment method:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
