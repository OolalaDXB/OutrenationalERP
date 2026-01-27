-- Fix infinite recursion in RLS: current_tenant_id() must not query customers under customers RLS
-- Make it SECURITY DEFINER with row_security disabled; it only returns tenant for auth.uid().

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1) Prefer explicit tenant membership
  SELECT tu.tenant_id
  INTO v_tenant_id
  FROM public.tenant_users tu
  WHERE tu.user_id = v_user_id
  ORDER BY tu.is_owner DESC, tu.created_at ASC
  LIMIT 1;

  IF v_tenant_id IS NOT NULL THEN
    RETURN v_tenant_id;
  END IF;

  -- 2) Fallback for PRO users: derive tenant from their customer profile
  SELECT c.tenant_id
  INTO v_tenant_id
  FROM public.customers c
  WHERE c.auth_user_id = v_user_id
    AND c.deleted_at IS NULL
  ORDER BY c.created_at ASC NULLS LAST
  LIMIT 1;

  RETURN v_tenant_id;
END;
$function$;

-- Ensure the function owner can be used safely (kept in public schema)
REVOKE ALL ON FUNCTION public.current_tenant_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_tenant_id() TO anon, authenticated;