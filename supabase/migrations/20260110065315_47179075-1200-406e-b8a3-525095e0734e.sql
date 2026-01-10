-- Create a test user for authentication testing
-- Note: This creates an entry in the public.users table
-- The actual auth user should be created via Supabase Auth UI or signUp

INSERT INTO public.users (auth_user_id, email, first_name, last_name, role, active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@vinylshop.com',
  'Admin',
  'Test',
  'admin',
  true
) ON CONFLICT (auth_user_id) DO NOTHING;