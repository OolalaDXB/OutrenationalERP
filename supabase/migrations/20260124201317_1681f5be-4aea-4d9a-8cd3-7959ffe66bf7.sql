-- Create RPC for creating purchase orders with CBAC guard
CREATE OR REPLACE FUNCTION public.create_purchase_order(
  p_supplier_id uuid,
  p_items jsonb,  -- Array of {product_id, quantity_ordered, unit_cost}
  p_notes text DEFAULT NULL,
  p_expected_delivery_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order_id uuid;
  v_order_number text;
  v_item jsonb;
BEGIN
  -- CBAC GUARD: Check if purchase_orders capability is enabled
  PERFORM public.assert_cbac('purchase_orders');
  
  -- Permission check: only staff/admin can create purchase orders
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: only staff and admin can create purchase orders';
  END IF;
  
  -- Generate order number
  SELECT 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         LPAD((COALESCE(MAX(CAST(SUBSTRING(order_number FROM 'PO-\d{8}-(\d+)') AS INTEGER)), 0) + 1)::TEXT, 4, '0')
  INTO v_order_number
  FROM purchase_orders
  WHERE order_number LIKE 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';
  
  IF v_order_number IS NULL THEN
    v_order_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0001';
  END IF;
  
  -- Create the purchase order
  INSERT INTO purchase_orders (
    order_number,
    supplier_id,
    status,
    notes,
    expected_delivery_date,
    created_by,
    created_at
  ) VALUES (
    v_order_number,
    p_supplier_id,
    'draft',
    p_notes,
    p_expected_delivery_date,
    auth.uid(),
    NOW()
  )
  RETURNING id INTO v_order_id;
  
  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO purchase_order_items (
      purchase_order_id,
      product_id,
      quantity_ordered,
      unit_cost,
      created_at
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity_ordered')::integer,
      (v_item->>'unit_cost')::numeric,
      NOW()
    );
  END LOOP;
  
  RETURN v_order_id;
END;
$function$;

-- Grant execute to authenticated users (the function itself checks permissions)
GRANT EXECUTE ON FUNCTION public.create_purchase_order(uuid, jsonb, text, date) TO authenticated;