-- Fix RLS policies: Change from RESTRICTIVE to PERMISSIVE for all tables

-- ===== INVOICES =====
DROP POLICY IF EXISTS "All authenticated can read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff and admin can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff and admin can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admin can delete invoices" ON public.invoices;

CREATE POLICY "All authenticated can read invoices" 
ON public.invoices FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert invoices" 
ON public.invoices FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update invoices" 
ON public.invoices FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete invoices" 
ON public.invoices FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== INVOICE_ITEMS =====
DROP POLICY IF EXISTS "All authenticated can read invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff and admin can insert invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff and admin can update invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Admin can delete invoice_items" ON public.invoice_items;

CREATE POLICY "All authenticated can read invoice_items" 
ON public.invoice_items FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert invoice_items" 
ON public.invoice_items FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update invoice_items" 
ON public.invoice_items FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete invoice_items" 
ON public.invoice_items FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== PRODUCTS =====
DROP POLICY IF EXISTS "All authenticated can read products" ON public.products;
DROP POLICY IF EXISTS "Staff and admin can insert products" ON public.products;
DROP POLICY IF EXISTS "Staff and admin can update products" ON public.products;
DROP POLICY IF EXISTS "Admin can delete products" ON public.products;

CREATE POLICY "All authenticated can read products" 
ON public.products FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert products" 
ON public.products FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update products" 
ON public.products FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete products" 
ON public.products FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== SUPPLIERS =====
DROP POLICY IF EXISTS "All authenticated can read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Staff and admin can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Staff and admin can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admin can delete suppliers" ON public.suppliers;

CREATE POLICY "All authenticated can read suppliers" 
ON public.suppliers FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert suppliers" 
ON public.suppliers FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update suppliers" 
ON public.suppliers FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete suppliers" 
ON public.suppliers FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== ORDERS =====
DROP POLICY IF EXISTS "All authenticated can read orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and admin can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Staff and admin can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admin can delete orders" ON public.orders;

CREATE POLICY "All authenticated can read orders" 
ON public.orders FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert orders" 
ON public.orders FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update orders" 
ON public.orders FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete orders" 
ON public.orders FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== ORDER_ITEMS =====
DROP POLICY IF EXISTS "All authenticated can read order_items" ON public.order_items;
DROP POLICY IF EXISTS "Staff and admin can insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Staff and admin can update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Admin can delete order_items" ON public.order_items;

CREATE POLICY "All authenticated can read order_items" 
ON public.order_items FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert order_items" 
ON public.order_items FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update order_items" 
ON public.order_items FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete order_items" 
ON public.order_items FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== CUSTOMERS =====
DROP POLICY IF EXISTS "All authenticated can read customers" ON public.customers;
DROP POLICY IF EXISTS "Staff and admin can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Staff and admin can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admin can delete customers" ON public.customers;

CREATE POLICY "All authenticated can read customers" 
ON public.customers FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert customers" 
ON public.customers FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update customers" 
ON public.customers FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete customers" 
ON public.customers FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== ARTISTS =====
DROP POLICY IF EXISTS "All authenticated can read artists" ON public.artists;
DROP POLICY IF EXISTS "Staff and admin can insert artists" ON public.artists;
DROP POLICY IF EXISTS "Staff and admin can update artists" ON public.artists;
DROP POLICY IF EXISTS "Admin can delete artists" ON public.artists;

CREATE POLICY "All authenticated can read artists" 
ON public.artists FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert artists" 
ON public.artists FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update artists" 
ON public.artists FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete artists" 
ON public.artists FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== GENRES =====
DROP POLICY IF EXISTS "All authenticated can read genres" ON public.genres;
DROP POLICY IF EXISTS "Staff and admin can insert genres" ON public.genres;
DROP POLICY IF EXISTS "Staff and admin can update genres" ON public.genres;
DROP POLICY IF EXISTS "Admin can delete genres" ON public.genres;

CREATE POLICY "All authenticated can read genres" 
ON public.genres FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert genres" 
ON public.genres FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update genres" 
ON public.genres FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete genres" 
ON public.genres FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== LABELS =====
DROP POLICY IF EXISTS "All authenticated can read labels" ON public.labels;
DROP POLICY IF EXISTS "Staff and admin can insert labels" ON public.labels;
DROP POLICY IF EXISTS "Staff and admin can update labels" ON public.labels;
DROP POLICY IF EXISTS "Admin can delete labels" ON public.labels;

CREATE POLICY "All authenticated can read labels" 
ON public.labels FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert labels" 
ON public.labels FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update labels" 
ON public.labels FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete labels" 
ON public.labels FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== STOCK_MOVEMENTS =====
DROP POLICY IF EXISTS "All authenticated can read stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Staff and admin can insert stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Staff and admin can update stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Admin can delete stock_movements" ON public.stock_movements;

CREATE POLICY "All authenticated can read stock_movements" 
ON public.stock_movements FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert stock_movements" 
ON public.stock_movements FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update stock_movements" 
ON public.stock_movements FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete stock_movements" 
ON public.stock_movements FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== SETTINGS =====
DROP POLICY IF EXISTS "All authenticated can read settings" ON public.settings;
DROP POLICY IF EXISTS "Admin can manage settings" ON public.settings;

CREATE POLICY "All authenticated can read settings" 
ON public.settings FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admin can manage settings" 
ON public.settings FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== USER_ROLES =====
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can manage user_roles" ON public.user_roles;

CREATE POLICY "Users can read own role" 
ON public.user_roles FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin can read all roles" 
ON public.user_roles FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage user_roles" 
ON public.user_roles FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== USERS =====
DROP POLICY IF EXISTS "All authenticated can read users" ON public.users;
DROP POLICY IF EXISTS "Admin can manage users" ON public.users;

CREATE POLICY "All authenticated can read users" 
ON public.users FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admin can manage users" 
ON public.users FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== PURCHASE_ORDERS =====
DROP POLICY IF EXISTS "All authenticated can read purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Staff and admin can insert purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Staff and admin can update purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admin can delete purchase_orders" ON public.purchase_orders;

CREATE POLICY "All authenticated can read purchase_orders" 
ON public.purchase_orders FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert purchase_orders" 
ON public.purchase_orders FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update purchase_orders" 
ON public.purchase_orders FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete purchase_orders" 
ON public.purchase_orders FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== PURCHASE_ORDER_ITEMS =====
DROP POLICY IF EXISTS "All authenticated can read purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Staff and admin can insert purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Staff and admin can update purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admin can delete purchase_order_items" ON public.purchase_order_items;

CREATE POLICY "All authenticated can read purchase_order_items" 
ON public.purchase_order_items FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert purchase_order_items" 
ON public.purchase_order_items FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update purchase_order_items" 
ON public.purchase_order_items FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete purchase_order_items" 
ON public.purchase_order_items FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== SUPPLIER_PAYOUTS =====
DROP POLICY IF EXISTS "All authenticated can read supplier_payouts" ON public.supplier_payouts;
DROP POLICY IF EXISTS "Staff and admin can insert supplier_payouts" ON public.supplier_payouts;
DROP POLICY IF EXISTS "Staff and admin can update supplier_payouts" ON public.supplier_payouts;
DROP POLICY IF EXISTS "Admin can delete supplier_payouts" ON public.supplier_payouts;

CREATE POLICY "All authenticated can read supplier_payouts" 
ON public.supplier_payouts FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert supplier_payouts" 
ON public.supplier_payouts FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can update supplier_payouts" 
ON public.supplier_payouts FOR UPDATE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Admin can delete supplier_payouts" 
ON public.supplier_payouts FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ===== PRODUCT_GENRES =====
DROP POLICY IF EXISTS "All authenticated can read product_genres" ON public.product_genres;
DROP POLICY IF EXISTS "Staff and admin can insert product_genres" ON public.product_genres;
DROP POLICY IF EXISTS "Staff and admin can update product_genres" ON public.product_genres;
DROP POLICY IF EXISTS "Admin can delete product_genres" ON public.product_genres;

CREATE POLICY "All authenticated can read product_genres" 
ON public.product_genres FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Staff and admin can insert product_genres" 
ON public.product_genres FOR INSERT 
TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));

CREATE POLICY "Staff and admin can delete product_genres" 
ON public.product_genres FOR DELETE 
TO authenticated
USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'staff'::app_role]));