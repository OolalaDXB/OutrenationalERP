-- Add PayPal email field to settings table
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS paypal_email text;