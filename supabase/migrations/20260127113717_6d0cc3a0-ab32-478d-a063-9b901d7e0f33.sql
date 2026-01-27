-- Drop dependent policies first
DROP POLICY IF EXISTS "Sillon admins can read sillon_admins" ON public.sillon_admins;
DROP POLICY IF EXISTS "Sillon admins can read all plans" ON public.sillon_plans;
DROP POLICY IF EXISTS "Sillon admins can read all addons" ON public.sillon_addons;
DROP POLICY IF EXISTS "Sillon admins can read plan versions" ON public.sillon_plan_versions;

-- Now drop the function
DROP FUNCTION IF EXISTS public.is_sillon_admin(uuid);

-- Recreate is_sillon_admin with SECURITY DEFINER to bypass RLS
CREATE FUNCTION public.is_sillon_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sillon_admins
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- Recreate the policies
CREATE POLICY "Sillon admins can read sillon_admins" 
ON public.sillon_admins FOR SELECT
USING (public.is_sillon_admin(auth.uid()));

CREATE POLICY "Sillon admins can read all plans" 
ON public.sillon_plans FOR SELECT
USING (public.is_sillon_admin(auth.uid()));

CREATE POLICY "Sillon admins can read all addons" 
ON public.sillon_addons FOR SELECT
USING (public.is_sillon_admin(auth.uid()));

CREATE POLICY "Sillon admins can read plan versions" 
ON public.sillon_plan_versions FOR SELECT
USING (public.is_sillon_admin(auth.uid()));

-- Grant SELECT on sillon_admins to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sillon_admins TO authenticated;