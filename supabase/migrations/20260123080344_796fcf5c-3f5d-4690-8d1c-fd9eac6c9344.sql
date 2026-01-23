-- Margin calculation view (handles consignment) - using commission_rate from suppliers
CREATE OR REPLACE VIEW public.v_order_items_with_margin AS
SELECT 
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.supplier_id,
  oi.title,
  oi.sku,
  oi.quantity,
  oi.unit_price,
  oi.unit_cost,
  oi.total_price,
  oi.supplier_type,
  oi.consignment_rate AS item_consignment_rate,
  oi.status,
  oi.created_at,
  o.created_at AS order_date,
  s.commission_rate AS supplier_commission_rate,
  CASE 
    WHEN oi.supplier_type = 'consignment' THEN 
      oi.unit_price * oi.quantity * (1 - COALESCE(oi.consignment_rate, s.commission_rate, 0))
    WHEN oi.unit_cost IS NOT NULL THEN 
      (oi.unit_price - oi.unit_cost) * oi.quantity
    ELSE NULL
  END AS margin,
  CASE 
    WHEN oi.supplier_type = 'consignment' THEN 'consignment'
    WHEN oi.unit_cost IS NOT NULL THEN 'purchase'
    ELSE 'unknown'
  END AS margin_type
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
LEFT JOIN suppliers s ON s.id = oi.supplier_id
WHERE oi.status != 'cancelled'
  AND o.status NOT IN ('cancelled', 'refunded');

-- Top products by revenue view
CREATE OR REPLACE VIEW public.v_top_products_by_revenue AS
SELECT 
  oi.product_id,
  oi.title,
  oi.sku,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.total_price) AS total_revenue,
  COUNT(DISTINCT oi.order_id) AS order_count
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE oi.status != 'cancelled'
  AND o.status NOT IN ('cancelled', 'refunded')
GROUP BY oi.product_id, oi.title, oi.sku
ORDER BY total_revenue DESC;