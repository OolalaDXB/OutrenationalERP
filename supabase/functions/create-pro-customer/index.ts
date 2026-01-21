import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-application-name",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: RegistrationData = await req.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return new Response(
        JSON.stringify({ error: "EMAIL_AND_PASSWORD_REQUIRED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.companyName || body.companyName.trim() === "") {
      return new Response(
        JSON.stringify({ error: "COMPANY_REQUIRED" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.password.length < 6) {
      return new Response(
        JSON.stringify({ error: "PASSWORD_TOO_SHORT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Creating auth user for:", body.email);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: false, // User must confirm email
    });

    if (authError) {
      console.error("Auth error:", authError);
      if (authError.message.includes("already been registered") || authError.message.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "EMAIL_ALREADY_USED" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AUTH_ERROR", details: authError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "USER_CREATION_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Auth user created:", authData.user.id);

    // Create customer record
    const customerData = {
      auth_user_id: authData.user.id,
      email: body.email,
      company_name: body.companyName.trim(),
      vat_number: body.vatNumber || null,
      first_name: body.firstName || null,
      last_name: body.lastName || null,
      phone: body.phone || null,
      address: body.address || null,
      address_line_2: body.addressLine2 || null,
      city: body.city || null,
      state: body.state || null,
      postal_code: body.postalCode || null,
      country: body.country || null,
      customer_type: "professional",
      approved: false, // Requires admin approval
      notes: body.notes
        ? `Demande d'inscription: ${body.notes}`
        : "Demande d'inscription via portail pro",
    };

    console.log("Creating customer record");

    const { data: customerResult, error: customerError } = await supabase
      .from("customers")
      .insert(customerData)
      .select()
      .single();

    if (customerError) {
      console.error("Customer creation error:", customerError);
      // Rollback: delete the auth user if customer creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "CUSTOMER_CREATION_FAILED", details: customerError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Customer created:", customerResult.id);

    // Resend confirmation email via invite link (doesn't require password)
    const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(body.email, {
      redirectTo: `${req.headers.get("origin") || "https://id-preview--3312b695-7d91-4ee6-9015-47e73404bb0f.lovable.app"}/pro/login`,
    });

    if (emailError) {
      console.warn("Email sending warning:", emailError);
      // Don't fail the registration if email fails - user was already created
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        customerId: customerResult.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
