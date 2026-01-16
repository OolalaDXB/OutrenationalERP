-- Add new invoice customization fields to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS payment_terms_text TEXT,
ADD COLUMN IF NOT EXISTS legal_mentions TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS bic TEXT,
ADD COLUMN IF NOT EXISTS eori TEXT;

-- Create storage bucket for shop assets (logo, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policy to allow authenticated users to view shop assets
CREATE POLICY "Shop assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-assets');

-- Create policy for authenticated users to upload shop assets
CREATE POLICY "Authenticated users can upload shop assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'shop-assets' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to update shop assets
CREATE POLICY "Authenticated users can update shop assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'shop-assets' AND auth.role() = 'authenticated');

-- Create policy for authenticated users to delete shop assets
CREATE POLICY "Authenticated users can delete shop assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'shop-assets' AND auth.role() = 'authenticated');