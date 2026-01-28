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
    const userEmail = claims.claims.email as string;

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

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

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

      const customer = await stripe.customers.create({
        email: userEmail,
        name: tenant?.name || 'Tenant',
        metadata: { tenant_id, created_by: userId },
      });
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

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: { tenant_id },
    });

    console.log('SetupIntent created:', setupIntent.id, 'for tenant:', tenant_id);

    return new Response(JSON.stringify({
      client_secret: setupIntent.client_secret,
      customer_id: stripeCustomerId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating setup intent:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
