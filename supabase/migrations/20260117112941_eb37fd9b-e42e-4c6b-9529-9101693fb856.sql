-- Drop existing function and recreate with correct signature
DROP FUNCTION IF EXISTS public.admin_list_users_with_roles();

CREATE OR REPLACE FUNCTION public.admin_list_users_with_roles()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  role public.app_role,
  active boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admin or staff to call this function
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    COALESCE(ur.role, 'viewer'::public.app_role) as role,
    COALESCE(u.active, true) as active,
    u.created_at
  FROM public.users u
  LEFT JOIN public.user_roles ur ON ur.user_id = u.id
  ORDER BY u.email ASC;
END;
$$;