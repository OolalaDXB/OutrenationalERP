CREATE OR REPLACE FUNCTION public.create_purchase_order(
  p_supplier_id uuid,
  p_items jsonb,
  p_notes text DEFAULT NULL::text,
  p_expected_delivery_date date DEFAULT NULL::date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_po_id uuid;
  v_po_number text;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total numeric := 0;
BEGIN
  -- CBAC GUARD: Check if purchase_orders capability is enabled
  PERFORM public.assert_cbac('purchase_orders');

  -- Permission check: only staff/admin can create purchase orders
  IF NOT public.is_staff_or_admin() THEN
    RAISE EXCEPTION 'Permission denied: only staff and admin can create purchase orders';
  END IF;

  -- Generate PO number (daily incremental)
  SELECT 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
         LPAD(
           (
             COALESCE(
               MAX(
                 CAST(
                   SUBSTRING(po_number FROM 'PO-\\d{8}-(\\d+)')
                   AS INTEGER
                 )
               ),
               0
             ) + 1
           )::TEXT,
           4,
           '0'
         )
  INTO v_po_number
  FROM public.purchase_orders
  WHERE po_number LIKE 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';

  IF v_po_number IS NULL THEN
    v_po_number := 'PO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-0001';
  END IF;

  -- Create the purchase order
  INSERT INTO public.purchase_orders (
    po_number,
    supplier_id,
    status,
    notes,
    expected_date,
    order_date,
    subtotal,
    total,
    created_at,
    updated_at
  ) VALUES (
    v_po_number,
    p_supplier_id,
    'draft',
    p_notes,
    p_expected_delivery_date,
    NOW()::date,
    0,
    0,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_po_id;

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.purchase_order_items (
      purchase_order_id,
      product_id,
      sku,
      title,
      quantity_ordered,
      quantity_received,
      unit_cost,
      total_cost,
      created_at
    ) VALUES (
      v_po_id,
      NULLIF(v_item->>'product_id','')::uuid,
      NULLIF(v_item->>'sku',''),
      COALESCE(NULLIF(v_item->>'title',''), ''),
      COALESCE(NULLIF(v_item->>'quantity_ordered','')::integer, 0),
      0,
      COALESCE(NULLIF(v_item->>'unit_cost','')::numeric, 0),
      COALESCE(NULLIF(v_item->>'quantity_ordered','')::integer, 0) * COALESCE(NULLIF(v_item->>'unit_cost','')::numeric, 0),
      NOW()
    );

    v_subtotal := v_subtotal + (COALESCE(NULLIF(v_item->>'quantity_ordered','')::integer, 0) * COALESCE(NULLIF(v_item->>'unit_cost','')::numeric, 0));
  END LOOP;

  v_total := v_subtotal + COALESCE((SELECT shipping_cost FROM public.purchase_orders WHERE id = v_po_id), 0);

  UPDATE public.purchase_orders
  SET subtotal = v_subtotal,
      total = v_total,
      updated_at = NOW()
  WHERE id = v_po_id;

  RETURN v_po_id;
END;
$function$;