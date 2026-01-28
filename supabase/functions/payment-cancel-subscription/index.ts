import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claims.claims.sub;
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

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    let result;
    if (cancel_at_period_end) {
      // Cancel at end of billing period
      result = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      console.log('Subscription set to cancel at period end:', subscription.stripe_subscription_id);
    } else {
      // Cancel immediately
      result = await stripe.subscriptions.cancel(subscription.stripe_subscription_id, {
        prorate: true,
      });
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

  } catch (error: unknown) {
    console.error('Error canceling subscription:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
