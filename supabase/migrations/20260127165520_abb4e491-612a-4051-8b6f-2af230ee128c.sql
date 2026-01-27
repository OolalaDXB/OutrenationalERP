-- Grant permissions on tenant_subscriptions table for the RPC to work
GRANT SELECT, INSERT, UPDATE ON public.tenant_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tenant_subscriptions TO anon;

-- Also ensure sillon_plans table is readable
GRANT SELECT ON public.sillon_plans TO authenticated;
GRANT SELECT ON public.sillon_plans TO anon;