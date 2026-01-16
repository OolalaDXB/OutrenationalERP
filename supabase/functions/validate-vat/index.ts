import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const result: ViesResponse = {
      valid: isValid,
      countryCode,
      vatNumber: number,
      name: companyName && companyName !== '---' ? companyName : undefined,
      address: companyAddress && companyAddress !== '---' ? companyAddress : undefined,
      requestDate,
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
