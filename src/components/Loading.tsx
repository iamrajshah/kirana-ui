import React from 'react';
import { IonLoading } from '@ionic/react';

interface LoadingProps {
  isOpen: boolean;
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ isOpen, message = 'Loading...' }) => {
  return <IonLoading isOpen={isOpen} message={message} />;
};
