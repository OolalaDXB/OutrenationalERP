-- Force PostgREST to reload schema cache after GRANT/VIEW changes
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';