-- Allow Sillon admins to view all tenants
CREATE POLICY "Sillon admins can view all tenants"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'mickael.thomas@pm.me',
      'mickael@oolala.ae'
    )
  );

-- Allow Sillon admins to update tenants
CREATE POLICY "Sillon admins can update tenants"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'mickael.thomas@pm.me',
      'mickael@oolala.ae'
    )
  );

-- Allow Sillon admins to view all tenant_users for counting
CREATE POLICY "Sillon admins can view all tenant_users"
  ON public.tenant_users
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN (
      'mickael.thomas@pm.me',
      'mickael@oolala.ae'
    )
  );