-- Grant permissions for PRO portal access
-- The orders table is accessed by pro customers via RLS policies that check customer_id

-- Ensure authenticated users can access orders (RLS will filter by customer_id)
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO anon;

-- Ensure authenticated users can access order_items (RLS will filter by order_id)
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT SELECT, INSERT ON public.order_items TO anon;

-- Ensure authenticated users can access products (for catalog)
GRANT SELECT ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;

-- Ensure authenticated users can access customers (for their own profile)
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.customers TO anon;

-- Ensure authenticated users can access invoices (for their orders)
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.invoices TO anon;

-- Ensure authenticated users can access labels (for catalog display)
GRANT SELECT ON public.labels TO authenticated;
GRANT SELECT ON public.labels TO anon;

-- Ensure authenticated users can access artists (for catalog display)
GRANT SELECT ON public.artists TO authenticated;
GRANT SELECT ON public.artists TO anon;

-- Ensure authenticated users can access settings (for shop info, payment methods)
GRANT SELECT ON public.settings TO authenticated;
GRANT SELECT ON public.settings TO anon;

-- Ensure authenticated users can access payment_methods (for checkout)
GRANT SELECT ON public.payment_methods TO authenticated;
GRANT SELECT ON public.payment_methods TO anon;

-- Ensure authenticated users can access shipping_zones and shipping_rates (for checkout)
GRANT SELECT ON public.shipping_zones TO authenticated;
GRANT SELECT ON public.shipping_zones TO anon;

GRANT SELECT ON public.shipping_rates TO authenticated;
GRANT SELECT ON public.shipping_rates TO anon;