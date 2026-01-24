import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AddOverrideRequest {
  action: "ADD_OVERRIDE";
  capability: string;
  enabled: boolean;
  expires_at?: string;
  reason?: string;
}

interface AddOverrideJsonRequest {
  action: "ADD_OVERRIDE_JSON";
  capability: string;
  payload: unknown;
  expires_at?: string;
  reason?: string;
}

interface RemoveOverrideRequest {
  action: "REMOVE_OVERRIDE";
  capability: string;
  reason?: string;
}

interface GetStatusRequest {
  action: "GET_STATUS";
}

type RequestBody =
  | AddOverrideRequest
  | AddOverrideJsonRequest
  | RemoveOverrideRequest
  | GetStatusRequest;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
      console.error("Missing environment variables");
      return new Response(
        JSON.stringify({ success: false, error: "SERVER_CONFIGURATION_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract JWT from Authorization header to verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    // Create client with anon key to verify caller's identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get the user from the JWT
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.warn("Failed to get user from JWT:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Request from user:", user.id, user.email);

    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Check if user is admin using has_role RPC
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError) {
      console.error("Error checking admin role:", roleError.message);
      return new Response(
        JSON.stringify({ success: false, error: "ROLE_CHECK_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      console.warn("Non-admin user attempted CBAC operation:", user.id);
      return new Response(
        JSON.stringify({ success: false, error: "FORBIDDEN" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: RequestBody = await req.json();
    console.log("CBAC action:", body.action);

    let result: { data: unknown; error: unknown };

    switch (body.action) {
      case "ADD_OVERRIDE": {
        const { capability, enabled, expires_at, reason } = body;
        
        if (!capability) {
          return new Response(
            JSON.stringify({ success: false, error: "MISSING_CAPABILITY" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Adding override: ${capability} = ${enabled}, expires: ${expires_at || "never"}`);
        
        result = await supabaseAdmin.rpc("cbac_add_override", {
          _capability: capability,
          _enabled: enabled ?? true,
          _value: null,
          _expires_at: expires_at || null,
          _reason: reason || null,
        });
        break;
      }

      case "ADD_OVERRIDE_JSON": {
        const { capability, payload, expires_at, reason } = body;
        
        if (!capability || payload === undefined) {
          return new Response(
            JSON.stringify({ success: false, error: "MISSING_CAPABILITY_OR_PAYLOAD" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Adding JSON override: ${capability}, payload:`, JSON.stringify(payload));
        
        result = await supabaseAdmin.rpc("cbac_add_override_json", {
          _capability: capability,
          _payload: payload,
          _expires_at: expires_at || null,
          _reason: reason || null,
        });
        break;
      }

      case "REMOVE_OVERRIDE": {
        const { capability, reason } = body;
        
        if (!capability) {
          return new Response(
            JSON.stringify({ success: false, error: "MISSING_CAPABILITY" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Removing override: ${capability}`);
        
        result = await supabaseAdmin.rpc("cbac_remove_override", {
          _capability: capability,
          _reason: reason || null,
        });
        break;
      }

      case "GET_STATUS": {
        console.log("Getting CBAC status");
        
        result = await supabaseAdmin.rpc("get_cbac");
        break;
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: "UNKNOWN_ACTION" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (result.error) {
      console.error("RPC error:", result.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RPC_FAILED", 
          details: (result.error as { message?: string })?.message || String(result.error)
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("CBAC operation successful");
    
    return new Response(
      JSON.stringify({ success: true, data: result.data, error: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "INTERNAL_ERROR", 
        details: String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
