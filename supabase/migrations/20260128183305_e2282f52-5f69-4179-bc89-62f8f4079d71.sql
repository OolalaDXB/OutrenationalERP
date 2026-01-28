-- Grant permissions on tenant_invoices for authenticated users
GRANT SELECT, INSERT, UPDATE ON public.tenant_invoices TO authenticated;
GRANT SELECT ON public.tenant_invoices TO anon;

-- Grant permissions on sillon_plans for public read
GRANT SELECT ON public.sillon_plans TO authenticated;
GRANT SELECT ON public.sillon_plans TO anon;

-- Grant permissions on tenant_subscriptions for authenticated users
GRANT SELECT, INSERT, UPDATE ON public.tenant_subscriptions TO authenticated;
GRANT SELECT ON public.tenant_subscriptions TO anon;

-- Grant permissions on tenants for authenticated users
GRANT SELECT, UPDATE ON public.tenants TO authenticated;
GRANT SELECT ON public.tenants TO anon;