import React, { useEffect, useState } from 'react';
import { IonToast } from '@ionic/react';
import { notificationService, ToastMessage } from '../core/services/notificationService';
import { checkmarkCircle, closeCircle, informationCircle, warning } from 'ionicons/icons';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);
    });

    return unsubscribe;
  }, []);

  const handleDismiss = (toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  };

  const getToastIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return checkmarkCircle;
      case 'error':
        return closeCircle;
      case 'warning':
        return warning;
      case 'info':
        return informationCircle;
      default:
        return informationCircle;
    }
  };

  const getToastColor = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'primary';
      default:
        return 'medium';
    }
  };

  return (
    <>
      {toasts.map((toast) => (
        <IonToast
          key={toast.id}
          isOpen={true}
          message={toast.message}
          duration={toast.duration || 3000}
          position="bottom"
          color={getToastColor(toast.type)}
          icon={getToastIcon(toast.type)}
          onDidDismiss={() => handleDismiss(toast.id)}
          buttons={[
            {
              text: 'Dismiss',
              role: 'cancel',
            },
          ]}
        />
      ))}
    </>
  );
};

export default ToastContainer;
