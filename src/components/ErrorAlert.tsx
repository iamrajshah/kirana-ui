import React from 'react';
import { IonAlert } from '@ionic/react';

interface ErrorAlertProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  title?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  isOpen,
  onClose,
  message,
  title = 'Error',
}) => {
  return (
    <IonAlert
      isOpen={isOpen}
      onDidDismiss={onClose}
      header={title}
      message={message}
      buttons={['OK']}
    />
  );
};
