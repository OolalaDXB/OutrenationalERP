import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { products, orders } from "@/data/demo-data";

export type NotificationType = "stock_alert" | "new_order" | "order_shipped" | "payment" | "supplier" | "info" | "incomplete_product";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  link?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "read" | "createdAt">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Générer des notifications initiales depuis les données
const generateInitialNotifications = (): Notification[] => {
  const notifications: Notification[] = [];
  let notifId = 1;

  // Alertes stock
  products
    .filter((p) => p.stock === 0)
    .forEach((product) => {
      notifications.push({
        id: `notif-${notifId++}`,
        type: "stock_alert",
        title: "Rupture de stock",
        message: `${product.title} est en rupture de stock`,
        read: false,
        createdAt: new Date(Date.now() - Math.random() * 86400000),
        link: "/inventory",
      });
    });

  products
    .filter((p) => p.stock > 0 && p.stock <= p.threshold)
    .slice(0, 3)
    .forEach((product) => {
      notifications.push({
        id: `notif-${notifId++}`,
        type: "stock_alert",
        title: "Stock faible",
        message: `${product.title} : ${product.stock} unités restantes (seuil: ${product.threshold})`,
        read: false,
        createdAt: new Date(Date.now() - Math.random() * 172800000),
        link: "/reorder",
      });
    });

  // Nouvelles commandes
  orders
    .filter((o) => o.status === "pending")
    .forEach((order) => {
      notifications.push({
        id: `notif-${notifId++}`,
        type: "new_order",
        title: "Nouvelle commande",
        message: `Commande ${order.orderNumber} de ${order.customerName}`,
        read: Math.random() > 0.5,
        createdAt: new Date(order.createdAt),
        link: "/orders",
      });
    });

  // Commandes expédiées
  orders
    .filter((o) => o.status === "shipped")
    .slice(0, 2)
    .forEach((order) => {
      notifications.push({
        id: `notif-${notifId++}`,
        type: "order_shipped",
        title: "Commande expédiée",
        message: `${order.orderNumber} a été expédiée`,
        read: true,
        createdAt: new Date(order.createdAt),
        link: "/orders",
      });
    });

  return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(generateInitialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, "id" | "read" | "createdAt">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      read: false,
      createdAt: new Date(),
    };
    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
