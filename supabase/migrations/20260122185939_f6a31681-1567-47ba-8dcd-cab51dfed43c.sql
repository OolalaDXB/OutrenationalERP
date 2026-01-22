-- 1. Trigger pour gérer l'annulation/retour des items individuels
CREATE OR REPLACE FUNCTION public.update_stock_on_order_item_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- Quand un item passe à 'cancelled' (et était 'active')
    IF NEW.status = 'cancelled' AND OLD.status = 'active' AND NEW.product_id IS NOT NULL THEN
        -- Bypass le trigger block_manual_stock_update
        PERFORM set_config('sillon.allow_stock_update', 'true', true);
        UPDATE products 
        SET stock = stock + OLD.quantity
        WHERE id = NEW.product_id;
    END IF;
    
    -- Quand un item passe à 'returned' (et était 'active')
    IF NEW.status = 'returned' AND OLD.status = 'active' AND NEW.product_id IS NOT NULL THEN
        PERFORM set_config('sillon.allow_stock_update', 'true', true);
        UPDATE products 
        SET stock = stock + OLD.quantity
        WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_stock_on_order_item_cancel ON order_items;
CREATE TRIGGER trigger_stock_on_order_item_cancel
    BEFORE UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stock_on_order_item_cancel();

-- 2. Corriger le trigger de commande pour ne restaurer que les items ACTIFS
CREATE OR REPLACE FUNCTION public.update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- Si commande confirmée, décrémenter le stock (seulement items actifs)
    IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
        PERFORM set_config('sillon.allow_stock_update', 'true', true);
        UPDATE products p
        SET stock = p.stock - oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id 
          AND p.id = oi.product_id
          AND oi.status = 'active';
    END IF;
    
    -- Si commande annulée, restaurer le stock (seulement items encore actifs)
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        PERFORM set_config('sillon.allow_stock_update', 'true', true);
        UPDATE products p
        SET stock = p.stock + oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.id 
          AND p.id = oi.product_id
          AND oi.status = 'active';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;