import { useCallback } from 'react';
import { useNotifications, NotificationType } from '@/hooks/use-notifications';

export function useProductNotifications() {
  const { addNotification } = useNotifications();

  const notifyIncompleteProduct = useCallback((product: any, missingFields: string[]) => {
    const fieldsText = missingFields.join(', ');
    addNotification({
      type: 'incomplete_product' as NotificationType,
      title: 'Produit incomplet',
      message: `"${product.title}" a des informations manquantes : ${fieldsText}`,
      link: '/inventory',
    });
  }, [addNotification]);

  return { notifyIncompleteProduct };
}
