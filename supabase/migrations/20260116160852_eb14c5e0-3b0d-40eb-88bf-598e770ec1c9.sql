-- Add CGV column to settings
ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS cgv TEXT;