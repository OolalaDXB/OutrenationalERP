-- Create shipping zones table
CREATE TABLE IF NOT EXISTS public.shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  countries TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create shipping rates table
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.shipping_zones(id) ON DELETE CASCADE,
  min_total NUMERIC DEFAULT 0,
  price NUMERIC NOT NULL,
  free_above NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

-- Policies for shipping_zones
CREATE POLICY "Anyone can read shipping zones" ON public.shipping_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage shipping zones" ON public.shipping_zones FOR ALL TO authenticated USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

-- Policies for shipping_rates
CREATE POLICY "Anyone can read shipping rates" ON public.shipping_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can manage shipping rates" ON public.shipping_rates FOR ALL TO authenticated USING (is_staff_or_admin()) WITH CHECK (is_staff_or_admin());

-- Seed default zones
INSERT INTO public.shipping_zones (name, countries) VALUES
('France', ARRAY['FR']),
('Europe', ARRAY['DE','BE','NL','IT','ES','PT','AT','CH','LU','IE','GB','PL','CZ','DK','SE','NO','FI']),
('Monde', ARRAY['*']);

-- Seed default rates
INSERT INTO public.shipping_rates (zone_id, price, free_above) VALUES
((SELECT id FROM public.shipping_zones WHERE name = 'France'), 8, 150),
((SELECT id FROM public.shipping_zones WHERE name = 'Europe'), 15, 250),
((SELECT id FROM public.shipping_zones WHERE name = 'Monde'), 25, 350);