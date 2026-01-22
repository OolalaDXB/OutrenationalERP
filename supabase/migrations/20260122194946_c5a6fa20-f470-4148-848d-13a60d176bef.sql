-- Grant table privileges for bank_accounts (RLS policies exist but GRANT is missing)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bank_accounts TO authenticated;
GRANT SELECT ON TABLE public.bank_accounts TO anon;