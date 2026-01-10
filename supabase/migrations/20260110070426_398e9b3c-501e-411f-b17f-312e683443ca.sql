-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'viewer',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any of the specified roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  )
$$;

-- RLS policy for user_roles: users can read their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing permissive policies and recreate with role-based access
-- Products: viewers can read, staff/admin can write
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "All authenticated can read products"
ON public.products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admin can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Staff and admin can update products"
ON public.products FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Admin can delete products"
ON public.products FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Orders: viewers can read, staff/admin can write
DROP POLICY IF EXISTS "Authenticated users can read orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;

CREATE POLICY "All authenticated can read orders"
ON public.orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admin can insert orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Staff and admin can update orders"
ON public.orders FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Admin can delete orders"
ON public.orders FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Customers: viewers can read, staff/admin can write
DROP POLICY IF EXISTS "Authenticated users can read customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

CREATE POLICY "All authenticated can read customers"
ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admin can insert customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Staff and admin can update customers"
ON public.customers FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Admin can delete customers"
ON public.customers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Suppliers: viewers can read, staff/admin can write
DROP POLICY IF EXISTS "Authenticated users can read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete suppliers" ON public.suppliers;

CREATE POLICY "All authenticated can read suppliers"
ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admin can insert suppliers"
ON public.suppliers FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Staff and admin can update suppliers"
ON public.suppliers FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Admin can delete suppliers"
ON public.suppliers FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Invoices: viewers can read, staff/admin can manage
DROP POLICY IF EXISTS "Authenticated users can read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON public.invoices;

CREATE POLICY "All authenticated can read invoices"
ON public.invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff and admin can insert invoices"
ON public.invoices FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Staff and admin can update invoices"
ON public.invoices FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'staff']::app_role[]));

CREATE POLICY "Admin can delete invoices"
ON public.invoices FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Settings: only admin can modify
DROP POLICY IF EXISTS "Authenticated users can read settings" ON public.settings;

CREATE POLICY "All authenticated can read settings"
ON public.settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can manage settings"
ON public.settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-assign viewer role on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_add_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();