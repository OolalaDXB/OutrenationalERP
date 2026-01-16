-- Add setting for optional Artists section
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS show_artists_section BOOLEAN DEFAULT false;