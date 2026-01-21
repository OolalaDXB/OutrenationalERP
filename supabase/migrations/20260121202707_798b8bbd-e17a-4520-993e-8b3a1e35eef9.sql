-- Drop the restrictive service_role policy
DROP POLICY IF EXISTS "service_role_full_access" ON public.customers;

-- Create a PERMISSIVE policy for service role (uses (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role')
-- Service role bypasses RLS by default when using the service key, but we need to ensure no restrictive policies block it
-- The issue is that RESTRICTIVE policies require ALL policies to pass, so we'll create a permissive one

CREATE POLICY "service_role_bypass" ON public.customers
FOR ALL
USING (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
)
WITH CHECK (
  (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
);