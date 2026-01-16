-- Ensure the standard PostgREST roles have privileges on invoice_history
GRANT SELECT, INSERT ON TABLE public.invoice_history TO authenticated;
GRANT SELECT ON TABLE public.invoice_history TO anon;

-- If invoice_history uses uuid default / sequences, keep consistent (no sequences expected)
-- Also ensure RLS is enabled (required for policies to apply)
ALTER TABLE public.invoice_history ENABLE ROW LEVEL SECURITY;