import { Link } from "react-router-dom";
import { Trash2, Minus, Plus, ShoppingBag, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProAuth } from "@/hooks/useProAuth";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/format";

const MIN_ORDER_AMOUNT = 100;

export function ProCart() {
  const { customer } = useProAuth();
  const { items, updateQuantity, removeItem, clearCart, getTotal, getSubtotal } = useCart();

  const discountRate = customer?.discount_rate || 0;
  const subtotal = getSubtotal();
  const discountAmount = subtotal * (discountRate / 100);
  const total = getTotal(discountRate);
  const canOrder = total >= MIN_ORDER_AMOUNT;

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Votre panier est vide</h2>
        <p className="text-muted-foreground mb-6">
          Parcourez notre catalogue pour ajouter des produits.
        </p>
        <Link to="/pro/catalog">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voir le catalogue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panier</h1>
        <Button variant="ghost" size="sm" onClick={clearCart}>
          Vider le panier
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div 
              key={item.product.id}
              className="bg-card rounded-xl border border-border p-4 flex gap-4"
            >
              {/* Image */}
              <div className="w-20 h-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                {item.product.image_url ? (
                  <img 
                    src={item.product.image_url} 
                    alt={item.product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    VINYL
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.product.title}</p>
                <p className="text-sm text-muted-foreground">{item.product.artist_name || '—'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs uppercase text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                    {item.product.format}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.product.stock} en stock
                  </span>
                </div>
              </div>

              {/* Quantity & price */}
              <div className="flex flex-col items-end gap-2">
                <p className="font-semibold">
                  {formatCurrency(item.product.selling_price * item.quantity * (1 - discountRate / 100))}
                </p>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= (item.product.stock ?? 0)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeItem(item.product.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border p-6 sticky top-24 space-y-4">
            <h3 className="font-semibold">Résumé</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountRate > 0 && (
                <div className="flex justify-between text-success">
                  <span>Remise pro ({discountRate}%)</span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                <span>Total HT</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {!canOrder && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Commande minimum: {formatCurrency(MIN_ORDER_AMOUNT)}. 
                  Il vous manque {formatCurrency(MIN_ORDER_AMOUNT - total)}.
                </span>
              </div>
            )}

            <Link to="/pro/checkout">
              <Button 
                className="w-full" 
                size="lg"
                disabled={!canOrder}
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Passer à la caisse
              </Button>
            </Link>

            <p className="text-xs text-muted-foreground text-center">
              Paiement à {customer?.payment_terms || 30} jours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
