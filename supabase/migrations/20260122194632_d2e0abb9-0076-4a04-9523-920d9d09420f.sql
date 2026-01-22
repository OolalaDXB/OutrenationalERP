-- Ensure RLS is enabled (safe if already enabled)
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- PostgREST also requires table privileges (GRANT) in addition to RLS policies
GRANT SELECT ON TABLE public.payment_methods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payment_methods TO authenticated;

-- (Optional) if you use the "service_role" key via PostgREST (rare), keep it explicit
GRANT ALL ON TABLE public.payment_methods TO service_role;