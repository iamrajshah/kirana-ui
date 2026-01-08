import React from 'react';
import { IonLoading } from '@ionic/react';
import { useTranslation } from 'react-i18next';

interface LoadingProps {
  isOpen: boolean;
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ isOpen, message }) => {
  const { t } = useTranslation();
  return <IonLoading isOpen={isOpen} message={message || t('common.loading')} />;
};
