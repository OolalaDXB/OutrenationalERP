import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscogsSearchResult {
  id: number;
  title: string;
  thumb: string;
  cover_image: string;
  year?: string;
  country?: string;
  label?: string[];
  format?: string[];
  catno?: string;
  resource_url: string;
}

interface DiscogsResponse {
  results: DiscogsSearchResult[];
  pagination: {
    items: number;
    page: number;
    pages: number;
  };
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
    // Initialize Supabase client to verify user and check role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);

    if (verifyError || !user) {
      console.error('Token verification failed:', verifyError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has staff, admin, or viewer role (internal users only)
    const { data: isStaff, error: roleError } = await supabaseAdmin.rpc('has_any_role', {
      _user_id: user.id,
      _roles: ['admin', 'staff', 'viewer']
    });

    if (roleError || !isStaff) {
      console.log(`User ${user.id} denied access - not staff/admin/viewer`);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions',
          message: 'This feature is restricted to internal staff users'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const DISCOGS_TOKEN = Deno.env.get('DISCOGS_TOKEN');
    
    if (!DISCOGS_TOKEN) {
      console.error('DISCOGS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Discogs API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { barcode, query, type = 'release' } = await req.json();

    // Input validation
    if (!barcode && !query) {
      return new Response(
        JSON.stringify({ error: 'barcode or query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate barcode format (EAN-8, UPC-A, EAN-13)
    if (barcode) {
      if (typeof barcode !== 'string' || !/^\d{8,13}$/.test(barcode)) {
        return new Response(
          JSON.stringify({ error: 'Invalid barcode format. Must be 8-13 digits.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate query length
    if (query) {
      if (typeof query !== 'string' || query.length > 500) {
        return new Response(
          JSON.stringify({ error: 'Query too long. Maximum 500 characters.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate type parameter
    const validTypes = ['release', 'master', 'artist', 'label'];
    if (typeof type !== 'string' || !validTypes.includes(type)) {
      return new Response(
        JSON.stringify({ error: `Invalid search type. Must be one of: ${validTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let searchUrl: string;
    
    if (barcode) {
      // Search by barcode
      searchUrl = `https://api.discogs.com/database/search?barcode=${encodeURIComponent(barcode)}&type=${type}&per_page=10`;
    } else {
      // Search by query (artist + title)
      searchUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=${type}&per_page=10`;
    }

    console.log(`Searching Discogs: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
        'User-Agent': 'OutreNational/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discogs API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Discogs API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data: DiscogsResponse = await response.json();
    
    console.log(`Found ${data.results?.length || 0} results`);

    // Get high-res images for each result
    const resultsWithImages = await Promise.all(
      (data.results || []).slice(0, 5).map(async (result) => {
        try {
          // Get full release details for better images
          const releaseUrl = result.resource_url;
          const releaseResponse = await fetch(releaseUrl, {
            headers: {
              'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
              'User-Agent': 'OutreNational/1.0',
            },
          });

          if (releaseResponse.ok) {
            const releaseData = await releaseResponse.json();
            return {
              id: result.id,
              title: result.title,
              year: result.year,
              country: result.country,
              label: result.label,
              format: result.format,
              catno: releaseData.labels?.[0]?.catno || result.catno,
              thumb: result.thumb,
              cover_image: result.cover_image,
              images: releaseData.images?.map((img: any) => ({
                uri: img.uri,
                type: img.type,
                width: img.width,
                height: img.height,
              })) || [],
            };
          }

          return {
            id: result.id,
            title: result.title,
            year: result.year,
            country: result.country,
            label: result.label,
            format: result.format,
            catno: result.catno,
            thumb: result.thumb,
            cover_image: result.cover_image,
            images: result.cover_image ? [{ uri: result.cover_image, type: 'primary' }] : [],
          };
        } catch (e) {
          console.error('Error fetching release details:', e);
          return {
            id: result.id,
            title: result.title,
            year: result.year,
            country: result.country,
            label: result.label,
            format: result.format,
            catno: result.catno,
            thumb: result.thumb,
            cover_image: result.cover_image,
            images: result.cover_image ? [{ uri: result.cover_image, type: 'primary' }] : [],
          };
        }
      })
    );

    return new Response(
      JSON.stringify({
        results: resultsWithImages,
        total: data.pagination?.items || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in discogs-search:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
