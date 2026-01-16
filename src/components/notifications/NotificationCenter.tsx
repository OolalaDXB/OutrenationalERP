import { useState } from "react";
import { Bell, X, Check, AlertTriangle, ShoppingCart, Truck, Euro, Info, Package } from "lucide-react";
import { useNotifications, NotificationType } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface NotificationCenterProps {
  onNavigate?: (path: string) => void;
}

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string; bg: string }> = {
  stock_alert: { icon: AlertTriangle, color: "text-warning-foreground", bg: "bg-warning-light" },
  new_order: { icon: ShoppingCart, color: "text-info", bg: "bg-info-light" },
  order_shipped: { icon: Truck, color: "text-success", bg: "bg-success-light" },
  payment: { icon: Euro, color: "text-success", bg: "bg-success-light" },
  supplier: { icon: Package, color: "text-primary", bg: "bg-primary-light" },
  info: { icon: Info, color: "text-muted-foreground", bg: "bg-secondary" },
  incomplete_product: { icon: AlertTriangle, color: "text-warning-foreground", bg: "bg-warning-light" },
};

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotification, clearAll } = useNotifications();

  const handleNotificationClick = (notificationId: string, link?: string) => {
    markAsRead(notificationId);
    if (link && onNavigate) {
      onNavigate(link);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 bg-card rounded-xl border border-border shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                    <Check className="w-3 h-3 mr-1" />
                    Tout lire
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs h-7 text-muted-foreground">
                    Effacer tout
                  </Button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const config = typeConfig[notification.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-4 border-b border-border last:border-b-0 cursor-pointer hover:bg-secondary/50 transition-colors ${
                        !notification.read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => handleNotificationClick(notification.id, notification.link)}
                    >
                      <div className={`w-9 h-9 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotification(notification.id);
                            }}
                            className="p-1 rounded hover:bg-secondary text-muted-foreground"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <span className="text-[0.65rem] text-muted-foreground/70 mt-1 block">
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
