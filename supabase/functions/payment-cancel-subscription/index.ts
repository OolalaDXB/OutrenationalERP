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
    const { tenant_id, cancel_at_period_end = true } = await req.json();

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id required' }), {
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

    // Get subscription info
    const { data: subscription, error: subError } = await supabase
      .from('tenant_subscriptions')
      .select('stripe_subscription_id')
      .eq('tenant_id', tenant_id)
      .single();

    if (subError || !subscription?.stripe_subscription_id) {
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
      // Cancel at end of billing period
      result = await stripeRequest(`/subscriptions/${subscription.stripe_subscription_id}`, 'POST', {
        cancel_at_period_end: 'true',
      }, stripeKey);
      console.log('Subscription set to cancel at period end:', subscription.stripe_subscription_id);
    } else {
      // Cancel immediately
      result = await stripeRequest(`/subscriptions/${subscription.stripe_subscription_id}`, 'DELETE', null, stripeKey);
      console.log('Subscription canceled immediately:', subscription.stripe_subscription_id);
    }

    // Update local record
    await supabase
      .from('tenant_subscriptions')
      .update({
        status: cancel_at_period_end ? 'active' : 'canceled',
        cancel_at_period_end,
        canceled_at: cancel_at_period_end ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenant_id);

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
