-- Insert initial super admin
INSERT INTO sillon_admins (email, user_id, role, display_name, is_active)
VALUES ('mickael.thomas@pm.me', '8c435f8c-d6e2-4743-8d71-0f0822d1d508', 'super_admin', 'Mickael Thomas', true)
ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id, role = EXCLUDED.role;