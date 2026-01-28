-- Grant permissions on tenant_payment_methods for authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_payment_methods TO authenticated;

-- Also grant to anon for public read access if needed
GRANT SELECT ON public.tenant_payment_methods TO anon;