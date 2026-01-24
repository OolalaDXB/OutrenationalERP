-- =============================================================================
-- SPRINT 2 TASK 1: Purchase Order Lifecycle States (FIXED)
-- =============================================================================

-- A) Create enum type for purchase order status
CREATE TYPE public.po_status AS ENUM (
  'draft',
  'sent',
  'acknowledged',
  'partially_received',
  'received',
  'closed',
  'cancelled'
);

-- B) Convert purchase_orders.status from varchar to enum
-- Step 1: Update any NULL values to 'draft'
UPDATE public.purchase_orders SET status = 'draft' WHERE status IS NULL;

-- Step 2: Drop the existing default (varchar type)
ALTER TABLE public.purchase_orders ALTER COLUMN status DROP DEFAULT;

-- Step 3: Convert the column type
ALTER TABLE public.purchase_orders 
  ALTER COLUMN status TYPE public.po_status 
  USING status::public.po_status;

-- Step 4: Set NOT NULL and new default (enum type)
ALTER TABLE public.purchase_orders 
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'draft'::public.po_status;

-- C) Create transition validation function
CREATE OR REPLACE FUNCTION public.po_change_status(
  _po_id uuid,
  _to public.po_status,
  _reason text DEFAULT NULL
)
RETURNS public.po_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status public.po_status;
  v_po_number text;
  v_valid boolean := false;
BEGIN
  -- CBAC GUARD: Check if purchase_orders capability is enabled
  PERFORM public.assert_cbac('purchase_orders');
  
  -- Permission check: only staff/admin can change PO status
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: only staff and admin can change purchase order status'
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Get current status with lock
  SELECT status, po_number INTO v_current_status, v_po_number
  FROM public.purchase_orders
  WHERE id = _po_id
  FOR UPDATE;
  
  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Purchase order % not found', _po_id
      USING ERRCODE = 'P0001';
  END IF;
  
  -- No-op if already at target status
  IF v_current_status = _to THEN
    RETURN v_current_status;
  END IF;
  
  -- Validate transition based on current status
  CASE v_current_status
    WHEN 'draft' THEN
      v_valid := _to IN ('sent', 'cancelled');
      
    WHEN 'sent' THEN
      v_valid := _to IN ('acknowledged', 'cancelled');
      
    WHEN 'acknowledged' THEN
      v_valid := _to IN ('partially_received', 'received', 'cancelled');
      
    WHEN 'partially_received' THEN
      v_valid := _to IN ('received', 'cancelled');
      
    WHEN 'received' THEN
      v_valid := _to = 'closed';
      
    WHEN 'closed' THEN
      v_valid := false; -- Terminal state
      
    WHEN 'cancelled' THEN
      v_valid := false; -- Terminal state
      
    ELSE
      v_valid := false;
  END CASE;
  
  -- Reject invalid transition
  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid PO transition: % -> % is not allowed', v_current_status, _to
      USING ERRCODE = 'P0001';
  END IF;
  
  -- Update the status
  UPDATE public.purchase_orders
  SET 
    status = _to,
    updated_at = now()
  WHERE id = _po_id;
  
  -- Audit log via cbac_log_change
  PERFORM public.cbac_log_change(
    'PO_STATUS_CHANGE',
    'purchase_orders',
    jsonb_build_object('status', v_current_status::text),
    jsonb_build_object('status', _to::text),
    _reason,
    jsonb_build_object(
      'po_id', _po_id,
      'po_number', v_po_number,
      'transition', v_current_status::text || ' -> ' || _to::text
    )
  );
  
  RETURN _to;
END;
$function$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.po_change_status(uuid, public.po_status, text) TO authenticated;

-- D) Add comment for documentation
COMMENT ON FUNCTION public.po_change_status IS 
'Changes the status of a purchase order with transition validation.
Valid transitions:
  draft -> sent | cancelled
  sent -> acknowledged | cancelled
  acknowledged -> partially_received | received | cancelled
  partially_received -> received | cancelled
  received -> closed
  closed -> (terminal)
  cancelled -> (terminal)';