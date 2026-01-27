-- Create the Vinyl Paradise tenant
INSERT INTO public.tenants (name, slug, status, settings)
VALUES (
  'Vinyl Paradise',
  'vinyl-paradise',
  'active',
  '{"plan_code": "STARTER", "contact_email": "hugs@pandamood.com"}'::jsonb
);

-- Create settings for the tenant (using the tenant id we just created)
INSERT INTO public.settings (id, shop_name, shop_email, shop_country, plan_code)
SELECT id, 'Vinyl Paradise', 'hugs@pandamood.com', 'France', 'STARTER'
FROM public.tenants
WHERE slug = 'vinyl-paradise';