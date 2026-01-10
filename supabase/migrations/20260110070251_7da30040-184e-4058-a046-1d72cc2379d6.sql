-- Add RLS policies for all main tables to allow authenticated users to access data

-- PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
ON public.products FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete products"
ON public.products FOR DELETE
TO authenticated
USING (true);

-- SUPPLIERS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read suppliers"
ON public.suppliers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert suppliers"
ON public.suppliers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
ON public.suppliers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete suppliers"
ON public.suppliers FOR DELETE
TO authenticated
USING (true);

-- ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read orders"
ON public.orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete orders"
ON public.orders FOR DELETE
TO authenticated
USING (true);

-- ORDER_ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read order_items"
ON public.order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert order_items"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update order_items"
ON public.order_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete order_items"
ON public.order_items FOR DELETE
TO authenticated
USING (true);

-- CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read customers"
ON public.customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert customers"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
ON public.customers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete customers"
ON public.customers FOR DELETE
TO authenticated
USING (true);

-- ARTISTS
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read artists"
ON public.artists FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert artists"
ON public.artists FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update artists"
ON public.artists FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete artists"
ON public.artists FOR DELETE
TO authenticated
USING (true);

-- INVOICES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
ON public.invoices FOR UPDATE
TO authenticated
USING (true);

-- INVOICE_ITEMS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoice_items"
ON public.invoice_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert invoice_items"
ON public.invoice_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- STOCK_MOVEMENTS
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read stock_movements"
ON public.stock_movements FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert stock_movements"
ON public.stock_movements FOR INSERT
TO authenticated
WITH CHECK (true);

-- USERS (staff table)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read users"
ON public.users FOR SELECT
TO authenticated
USING (true);

-- SETTINGS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read settings"
ON public.settings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update settings"
ON public.settings FOR UPDATE
TO authenticated
USING (true);

-- LABELS
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read labels"
ON public.labels FOR SELECT
TO authenticated
USING (true);

-- GENRES
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read genres"
ON public.genres FOR SELECT
TO authenticated
USING (true);

-- SUPPLIER_PAYOUTS
ALTER TABLE public.supplier_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read supplier_payouts"
ON public.supplier_payouts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert supplier_payouts"
ON public.supplier_payouts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update supplier_payouts"
ON public.supplier_payouts FOR UPDATE
TO authenticated
USING (true);

-- PURCHASE_ORDERS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read purchase_orders"
ON public.purchase_orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage purchase_orders"
ON public.purchase_orders FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- PURCHASE_ORDER_ITEMS
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read purchase_order_items"
ON public.purchase_order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage purchase_order_items"
ON public.purchase_order_items FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);