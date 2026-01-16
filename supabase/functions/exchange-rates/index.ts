import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Using frankfurter.app - a free, reliable exchange rate API
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR');
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the USD to EUR rate
    const usdToEur = data.rates?.EUR || 0.92; // Fallback to approximate rate
    
    return new Response(
      JSON.stringify({
        success: true,
        rates: {
          USD_EUR: usdToEur,
          EUR_USD: 1 / usdToEur,
        },
        base: 'USD',
        date: data.date,
        source: 'frankfurter.app'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Exchange rate fetch error:', errorMessage);
    
    // Return fallback rates on error
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        rates: {
          USD_EUR: 0.92, // Fallback rate
          EUR_USD: 1.087,
        },
        fallback: true
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Still return 200 with fallback data
      }
    );
  }
});
