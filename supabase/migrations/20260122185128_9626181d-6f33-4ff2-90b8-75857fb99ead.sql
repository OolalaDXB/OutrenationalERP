-- Fix the check_pro_order_update trigger to allow staff/admin to update orders
-- The issue is that it checks if user is a customer BEFORE checking if they're staff

CREATE OR REPLACE FUNCTION public.check_pro_order_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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