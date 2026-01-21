import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Credentials": "true",
};

interface RegistrationData {
  email: string;
  password: string;
  companyName: string;
  vatNumber?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  debug?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const srk = Deno.env.get("MY_SERVICE_ROLE_KEY");

    if (!supabaseUrl) {
      return new Response(
        JSON.stringify({ error: "MISSING_ENV" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hard runtime check: service role must be present and look valid
    if (!srk || srk.length < 40) {
      return new Response(
        JSON.stringify({ error: "MISSING_SERVICE_ROLE" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, srk, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body: RegistrationData = await req.json();

    const debug = !!body.debug;
    const urlHost = (() => {
      try {
        return new URL(supabaseUrl).host;
      } catch {
        return supabaseUrl;
      }
    })();
    const srkPrefix = srk.slice(0, 3);

    if (debug) {
      console.log("SRK present", !!srk);
      console.log("SRK prefix", srkPrefix);
    }

    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ error: "EMAIL_AND_PASSWORD_REQUIRED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.companyName || !body.companyName.trim()) {
      return new Response(
        JSON.stringify({ error: "COMPANY_REQUIRED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.password.length < 8) {
      return new Response(
        JSON.stringify({ error: "PASSWORD_TOO_SHORT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency / anti-duplicate: reject if customer already exists for email
    const { data: existingCustomer, error: existingError } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();

    if (existingError) {
      return new Response(
        JSON.stringify({ error: "CUSTOMER_LOOKUP_FAILED", details: existingError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingCustomer?.id) {
      return new Response(
        JSON.stringify({ error: "EMAIL_ALREADY_USED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Create auth user (admin)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: false,
      });

    if (authError) {
      const msg = authError.message || "AUTH_ERROR";
      if (msg.includes("already been registered") || msg.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "EMAIL_ALREADY_USED" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AUTH_ERROR", details: msg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "USER_CREATION_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerInsert = {
      auth_user_id: authData.user.id,
      email: body.email,
      company_name: body.companyName.trim(),
      vat_number: body.vatNumber ?? null,
      first_name: body.firstName ?? null,
      last_name: body.lastName ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      address_line_2: body.addressLine2 ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      postal_code: body.postalCode ?? null,
      country: body.country ?? null,
      customer_type: "professional",
      approved: false,
      notes: body.notes
        ? `Demande d'inscription: ${body.notes}`
        : "Demande d'inscription via portail pro",
    };

    const { data: customerResult, error: customerError } = await supabaseAdmin
      .from("customers")
      .insert(customerInsert)
      .select("id")
      .single();

    if (customerError) {
      // rollback user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "CUSTOMER_CREATION_FAILED", details: customerError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prove RLS bypass with a simple admin SELECT
    const { data: verifyRow, error: verifyError } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();

    if (verifyError) {
      return new Response(
        JSON.stringify({ error: "POST_INSERT_VERIFY_FAILED", details: verifyError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const createdCustomerId = customerResult?.id ?? verifyRow?.id ?? null;

    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        customerId: createdCustomerId,
        ...(debug
          ? {
              srkPrefix,
              urlHost,
              createdUserId: authData.user.id,
              createdCustomerId,
            }
          : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
