import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle } from '@ionic/react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, onClick, className = '' }) => {
  return (
    <IonCard className={`m-0 ${className}`} button={!!onClick} onClick={onClick}>
      {title && (
        <IonCardHeader>
          <IonCardTitle className="text-lg font-semibold">{title}</IonCardTitle>
        </IonCardHeader>
      )}
      <IonCardContent>{children}</IonCardContent>
    </IonCard>
  );
};
