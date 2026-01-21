import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ViesResponse {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name?: string;
  address?: string;
  requestDate: string;
  cached?: boolean;
}

interface CacheEntry {
  id: string;
  vat_number: string;
  country_code: string;
  is_valid: boolean;
  company_name: string | null;
  company_address: string | null;
  validated_at: string;
  expires_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { vatNumber } = await req.json();

    if (!vatNumber || typeof vatNumber !== 'string') {
      return new Response(
        JSON.stringify({ error: 'VAT number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the VAT number (remove spaces and special characters)
    const cleanVat = vatNumber.replace(/[\s.-]/g, '').toUpperCase();
    
    // Extract country code (first 2 characters) and number
    if (cleanVat.length < 4) {
      return new Response(
        JSON.stringify({ error: 'Invalid VAT number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const countryCode = cleanVat.substring(0, 2);
    const number = cleanVat.substring(2);

    // Validate country code is EU
    const euCountries = [
      'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 
      'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 
      'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI' // XI for Northern Ireland
    ];

    if (!euCountries.includes(countryCode)) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Not an EU country code',
          countryCode,
          vatNumber: number
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client for cache operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check cache first
    const { data: cachedResult, error: cacheError } = await supabase
      .from('vat_validations_cache')
      .select('*')
      .eq('vat_number', cleanVat)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cachedResult && !cacheError) {
      console.log(`Cache hit for VAT: ${cleanVat}`);
      const result: ViesResponse = {
        valid: cachedResult.is_valid,
        countryCode: cachedResult.country_code,
        vatNumber: number,
        name: cachedResult.company_name || undefined,
        address: cachedResult.company_address || undefined,
        requestDate: cachedResult.validated_at,
        cached: true,
      };

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cache miss for VAT: ${cleanVat}, calling VIES API`);

    // Call the VIES SOAP API
    const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soap:Body>
    <tns1:checkVat>
      <tns1:countryCode>${countryCode}</tns1:countryCode>
      <tns1:vatNumber>${number}</tns1:vatNumber>
    </tns1:checkVat>
  </soap:Body>
</soap:Envelope>`;

    const viesResponse = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': '',
      },
      body: soapEnvelope,
    });

    const responseText = await viesResponse.text();
    
    // Parse the SOAP response
    const validMatch = responseText.match(/<valid>(\w+)<\/valid>/);
    const nameMatch = responseText.match(/<name>([^<]*)<\/name>/);
    const addressMatch = responseText.match(/<address>([^<]*)<\/address>/);
    const requestDateMatch = responseText.match(/<requestDate>([^<]*)<\/requestDate>/);

    const isValid = validMatch ? validMatch[1].toLowerCase() === 'true' : false;
    const companyName = nameMatch ? nameMatch[1].trim() : undefined;
    const companyAddress = addressMatch ? addressMatch[1].trim() : undefined;
    const requestDate = requestDateMatch ? requestDateMatch[1] : new Date().toISOString();

    // Store result in cache
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Cache for 30 days

    const { error: upsertError } = await supabase
      .from('vat_validations_cache')
      .upsert({
        vat_number: cleanVat,
        country_code: countryCode,
        is_valid: isValid,
        company_name: companyName && companyName !== '---' ? companyName : null,
        company_address: companyAddress && companyAddress !== '---' ? companyAddress : null,
        validated_at: requestDate,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'vat_number',
      });

    if (upsertError) {
      console.error('Failed to cache VAT validation:', upsertError);
    } else {
      console.log(`Cached VAT validation for: ${cleanVat}`);
    }

    const result: ViesResponse = {
      valid: isValid,
      countryCode,
      vatNumber: number,
      name: companyName && companyName !== '---' ? companyName : undefined,
      address: companyAddress && companyAddress !== '---' ? companyAddress : undefined,
      requestDate,
      cached: false,
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('VIES validation error:', err);
    
    const errorMessage = err instanceof Error ? err.message : '';
    
    // Check if it's a VIES service unavailable error
    if (errorMessage.includes('VIES') || errorMessage.includes('timeout')) {
      return new Response(
        JSON.stringify({ 
          error: 'VIES service temporarily unavailable', 
          valid: null,
          serviceUnavailable: true 
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to validate VAT number' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});