import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Ship24CreateTrackerRequest {
  trackingNumber: string;
  courierCode?: string;
  purchaseOrderId: string;
}

interface Ship24GetStatusRequest {
  trackerId: string;
}

interface Ship24WebhookEvent {
  trackerId: string;
  trackingNumber: string;
  events: Array<{
    eventId: string;
    trackingNumber: string;
    eventTrackingNumber: string;
    status: string;
    statusCode: string;
    statusCategory: string;
    statusMilestone: string;
    occurrenceDatetime: string;
    location: {
      city?: string;
      state?: string;
      country?: string;
      countryIso2?: string;
    };
    sourceCode: string;
  }>;
  shipment?: {
    statusCode: string;
    statusCategory: string;
    statusMilestone: string;
  };
}

// Map Ship24 status categories to our simplified status
function mapShip24Status(statusMilestone: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'info_received': 'pending',
    'in_transit': 'in_transit',
    'out_for_delivery': 'out_for_delivery',
    'delivered': 'delivered',
    'available_for_pickup': 'out_for_delivery',
    'exception': 'exception',
    'failed_attempt': 'exception',
    'unknown': 'unknown',
  };
  return statusMap[statusMilestone?.toLowerCase()] || 'unknown';
}

// Carrier code mapping for Ship24
const carrierCodeMap: Record<string, string> = {
  'dhl': 'dhl',
  'fedex': 'fedex',
  'ups': 'ups',
  'colissimo': 'colissimo',
  'la_poste': 'laposte',
  'chronopost': 'chronopost',
  'tnt': 'tnt',
  'gls': 'gls',
  'mondial_relay': 'mondialrelay',
  'dpd': 'dpd',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const ship24ApiKey = Deno.env.get('SHIP24_API_KEY');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    // ===== CREATE TRACKER =====
    if (path === 'create-tracker' && req.method === 'POST') {
      if (!ship24ApiKey) {
        return new Response(
          JSON.stringify({ error: 'Ship24 API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body: Ship24CreateTrackerRequest = await req.json();
      const { trackingNumber, courierCode, purchaseOrderId } = body;

      if (!trackingNumber || !purchaseOrderId) {
        return new Response(
          JSON.stringify({ error: 'trackingNumber and purchaseOrderId are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Creating Ship24 tracker for ${trackingNumber} (PO: ${purchaseOrderId})`);

      // Create tracker via Ship24 API
      const ship24Payload: Record<string, unknown> = {
        trackingNumber: trackingNumber,
      };

      // Add courier code if provided
      if (courierCode && carrierCodeMap[courierCode]) {
        ship24Payload.courierCode = [carrierCodeMap[courierCode]];
      }

      const ship24Response = await fetch('https://api.ship24.com/public/v1/trackers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ship24ApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ship24Payload),
      });

      if (!ship24Response.ok) {
        const errorText = await ship24Response.text();
        console.error('Ship24 API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to create Ship24 tracker', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ship24Data = await ship24Response.json();
      const trackerId = ship24Data.data?.tracker?.trackerId;

      if (!trackerId) {
        console.error('No trackerId in Ship24 response:', ship24Data);
        return new Response(
          JSON.stringify({ error: 'No trackerId returned from Ship24' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Ship24 tracker created: ${trackerId}`);

      // Update purchase order with tracker ID
      const { error: updateError } = await supabase
        .from('purchase_orders')
        .update({
          ship24_tracker_id: trackerId,
          tracking_status: 'pending',
          tracking_last_update: new Date().toISOString(),
        })
        .eq('id', purchaseOrderId);

      if (updateError) {
        console.error('Failed to update PO:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update purchase order', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, trackerId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== GET TRACKING STATUS (manual refresh) =====
    if (path === 'get-status' && req.method === 'POST') {
      if (!ship24ApiKey) {
        return new Response(
          JSON.stringify({ error: 'Ship24 API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body: Ship24GetStatusRequest = await req.json();
      const { trackerId } = body;

      if (!trackerId) {
        return new Response(
          JSON.stringify({ error: 'trackerId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Fetching Ship24 status for tracker: ${trackerId}`);

      const ship24Response = await fetch(`https://api.ship24.com/public/v1/trackers/${trackerId}/results`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ship24ApiKey}`,
        },
      });

      if (!ship24Response.ok) {
        const errorText = await ship24Response.text();
        console.error('Ship24 API error:', errorText);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch tracking status', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const ship24Data = await ship24Response.json();
      const trackings = ship24Data.data?.trackings || [];
      
      if (trackings.length === 0) {
        return new Response(
          JSON.stringify({ status: 'pending', events: [], message: 'No tracking data yet' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const tracking = trackings[0];
      const events = tracking.events || [];
      const shipment = tracking.shipment;

      // Map events to our format
      const mappedEvents = events.map((e: Ship24WebhookEvent['events'][0]) => ({
        status: e.status,
        statusCode: e.statusCode,
        location: [e.location?.city, e.location?.state, e.location?.country].filter(Boolean).join(', '),
        message: e.status,
        occurredAt: e.occurrenceDatetime,
      }));

      const currentStatus = mapShip24Status(shipment?.statusMilestone || 'unknown');

      return new Response(
        JSON.stringify({
          status: currentStatus,
          statusMilestone: shipment?.statusMilestone,
          events: mappedEvents,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== WEBHOOK (from Ship24) =====
    if (path === 'webhook' && req.method === 'POST') {
      const body = await req.json();
      
      // Debug logging
      console.log('Ship24 webhook received');
      console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
      console.log('Body:', JSON.stringify(body, null, 2));
      
      // Check webhook secret if configured
      const webhookSecret = Deno.env.get('SHIP24_WEBHOOK_SECRET');
      console.log('Webhook secret configured:', !!webhookSecret);
      
      // Ship24 sends data in trackings array format
      // Structure: { trackings: [{ tracker: { trackerId }, shipment: {...}, events: [...] }] }
      const trackings = body.trackings || [];
      
      if (!trackings.length) {
        // Could be a test ping or empty webhook - return 200 OK
        console.log('No trackings in webhook payload - returning 200 OK (possibly test ping)');
        return new Response(
          JSON.stringify({ message: 'Webhook received, no trackings to process' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let processedCount = 0;
      let errorCount = 0;

      // Process each tracking in the webhook
      for (const tracking of trackings) {
        const trackerId = tracking.tracker?.trackerId;
        const trackingNumber = tracking.tracker?.trackingNumber;
        
        if (!trackerId) {
          console.log('Tracking entry without trackerId, skipping:', JSON.stringify(tracking.tracker));
          continue;
        }

        console.log(`Processing tracker: ${trackerId} (tracking number: ${trackingNumber})`);

        // Find the purchase order by tracker ID
        const { data: po, error: findError } = await supabase
          .from('purchase_orders')
          .select('id, tracking_events')
          .eq('ship24_tracker_id', trackerId)
          .single();

        if (findError || !po) {
          console.log(`PO not found for tracker ${trackerId} - this is OK for test webhooks`);
          continue;
        }

        // Extract events and status from this tracking
        const events: Ship24WebhookEvent['events'] = tracking.events || [];
        const shipment = tracking.shipment;
        const currentStatus = mapShip24Status(shipment?.statusMilestone || 'unknown');

        console.log(`Tracker ${trackerId}: status=${currentStatus}, events=${events.length}`);

        // Map events to our format
        const mappedEvents = events.map((e: Ship24WebhookEvent['events'][0]) => ({
          status: e.status,
          statusCode: e.statusCode,
          location: e.location ? [e.location.city, e.location.state, e.location.country].filter(Boolean).join(', ') : '',
          message: e.status,
          occurredAt: e.occurrenceDatetime,
        }));

        // Merge with existing events (dedupe by occurredAt)
        const existingEvents: Array<{ occurredAt: string }> = po.tracking_events || [];
        const existingTimestamps = new Set(existingEvents.map(e => e.occurredAt));
        const newEvents = mappedEvents.filter(e => !existingTimestamps.has(e.occurredAt));
        const allEvents = [...existingEvents, ...newEvents].sort(
          (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
        );

        // Update purchase order
        const { error: updateError } = await supabase
          .from('purchase_orders')
          .update({
            tracking_status: currentStatus,
            tracking_events: allEvents,
            tracking_last_update: new Date().toISOString(),
          })
          .eq('id', po.id);

        if (updateError) {
          console.error(`Failed to update PO ${po.id}:`, updateError);
          errorCount++;
          continue;
        }

        console.log(`Updated PO ${po.id} with ${newEvents.length} new events, status: ${currentStatus}`);
        processedCount++;
      }

      console.log(`Webhook processing complete: ${processedCount} processed, ${errorCount} errors`);

      // Always return 200 OK for valid webhooks to prevent retries
      return new Response(
        JSON.stringify({ 
          success: true, 
          trackingsReceived: trackings.length,
          trackingsProcessed: processedCount,
          errors: errorCount 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown path
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Ship24 function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
