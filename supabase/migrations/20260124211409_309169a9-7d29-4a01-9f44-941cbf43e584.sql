-- ============================================================
-- SECURITY FIX: Add security_invoker=true to views (fixes SECURITY DEFINER warnings)
-- ============================================================

-- Fix v_dashboard_stats
ALTER VIEW public.v_dashboard_stats SET (security_invoker = true);

-- Fix v_order_items_with_margin
ALTER VIEW public.v_order_items_with_margin SET (security_invoker = true);

-- Fix v_top_products_by_revenue  
ALTER VIEW public.v_top_products_by_revenue SET (security_invoker = true);

-- Fix v_cbac_status
ALTER VIEW public.v_cbac_status SET (security_invoker = true);

-- ============================================================
-- SECURITY FIX: Add search_path to functions missing it
-- ============================================================

-- 1. is_authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path = public
AS $function$
  SELECT auth.uid() IS NOT NULL;
$function$;

-- 2. is_staff_or_admin
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path = public
AS $function$
  SELECT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]);
$function$;

-- 3. is_viewer_or_more
CREATE OR REPLACE FUNCTION public.is_viewer_or_more()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path = public
AS $function$
  SELECT public.has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role, 'viewer'::app_role]);
$function$;

-- 4. block_manual_stock_update
CREATE OR REPLACE FUNCTION public.block_manual_stock_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF current_setting('sillon.allow_stock_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    RAISE EXCEPTION 'Direct stock updates are forbidden. Use apply_stock_movement(_v2) instead.';
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. force_customer_unapproved
CREATE OR REPLACE FUNCTION public.force_customer_unapproved()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NOT is_staff_or_admin() THEN
    NEW.approved := false;
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. generate_order_number
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '#(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM orders;
    
    NEW.order_number := '#' || LPAD(next_num::TEXT, 4, '0');
    RETURN NEW;
END;
$function$;

-- 7. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- 8. update_supplier_stats
CREATE OR REPLACE FUNCTION public.update_supplier_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    UPDATE suppliers 
    SET products_count = (
        SELECT COUNT(*) FROM products WHERE supplier_id = NEW.supplier_id
    )
    WHERE id = NEW.supplier_id;
    
    RETURN NEW;
END;
$function$;

-- 9. update_customer_stats
CREATE OR REPLACE FUNCTION public.update_customer_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
    UPDATE customers
    SET 
        orders_count = (
            SELECT COUNT(*) FROM orders 
            WHERE customer_id = NEW.customer_id 
            AND status NOT IN ('cancelled')
        ),
        total_spent = (
            SELECT COALESCE(SUM(total), 0) FROM orders 
            WHERE customer_id = NEW.customer_id 
            AND payment_status = 'paid'
        ),
        last_order_at = (
            SELECT MAX(created_at) FROM orders 
            WHERE customer_id = NEW.customer_id
        )
    WHERE id = NEW.customer_id;
    
    UPDATE customers
    SET average_order_value = CASE 
        WHEN orders_count > 0 THEN total_spent / orders_count 
        ELSE 0 
    END
    WHERE id = NEW.customer_id;
    
    RETURN NEW;
END;
$function$;

-- 10. count_products
CREATE OR REPLACE FUNCTION public.count_products(p_status text DEFAULT NULL::text, p_supplier_id uuid DEFAULT NULL::uuid, p_include_deleted boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM products
  WHERE (p_include_deleted OR deleted_at IS NULL)
    AND (p_status IS NULL OR status::text = p_status)
    AND (p_supplier_id IS NULL OR supplier_id = p_supplier_id);
  
  RETURN v_count;
END;
$function$;

-- 11. count_orders
CREATE OR REPLACE FUNCTION public.count_orders(p_status text DEFAULT NULL::text, p_customer_id uuid DEFAULT NULL::uuid, p_include_deleted boolean DEFAULT false)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_count bigint;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM orders
  WHERE (p_include_deleted OR deleted_at IS NULL)
    AND (p_status IS NULL OR status::text = p_status)
    AND (p_customer_id IS NULL OR customer_id = p_customer_id);
  
  RETURN v_count;
END;
$function$;

-- 12. set_audit_fields
CREATE OR REPLACE FUNCTION public.set_audit_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by = auth.uid();
    END IF;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
    NEW.updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 13. soft_delete
CREATE OR REPLACE FUNCTION public.soft_delete(p_table_name text, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_query text;
BEGIN
  v_query := format(
    'UPDATE %I SET deleted_at = now(), updated_by = %L WHERE id = %L AND deleted_at IS NULL',
    p_table_name,
    auth.uid(),
    p_id
  );
  EXECUTE v_query;
  RETURN FOUND;
END;
$function$;

-- 14. restore_deleted
CREATE OR REPLACE FUNCTION public.restore_deleted(p_table_name text, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_query text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admin can restore deleted items';
  END IF;
  
  v_query := format(
    'UPDATE %I SET deleted_at = NULL, updated_by = %L WHERE id = %L AND deleted_at IS NOT NULL',
    p_table_name,
    auth.uid(),
    p_id
  );
  EXECUTE v_query;
  RETURN FOUND;
END;
$function$;

-- 15. check_pro_order_update (this one was missing search_path but had SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.check_pro_order_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Staff/admin can do anything - check this FIRST
  IF is_staff_or_admin() THEN
    RETURN NEW;
  END IF;

  -- Now check if it's a Pro customer (not staff)
  IF EXISTS (SELECT 1 FROM customers WHERE auth_user_id = auth.uid()) THEN
    -- Pro customers can only:
    -- 1. Cancel a pending order
    IF NEW.status = 'cancelled' AND OLD.status = 'pending' THEN
      RETURN NEW;
    END IF;
    -- 2. Request a refund
    IF NEW.refund_requested = TRUE AND OLD.refund_requested = FALSE THEN
      RETURN NEW;
    END IF;
    -- 3. Add a refund reason
    IF NEW.refund_reason IS DISTINCT FROM OLD.refund_reason AND NEW.refund_requested = TRUE THEN
      RETURN NEW;
    END IF;
    -- Otherwise, block
    RAISE EXCEPTION 'Modification non autorisée';
  END IF;
  
  -- If not staff and not a known customer, block by default
  RAISE EXCEPTION 'Modification non autorisée';
END;
$function$;