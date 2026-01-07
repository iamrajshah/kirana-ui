import React from 'react';
import { IonButton, IonSpinner } from '@ionic/react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'small' | 'default' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'default',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
}) => {
  const getColor = () => {
    switch (variant) {
      case 'primary':
        return 'primary';
      case 'secondary':
        return 'medium';
      case 'success':
        return 'success';
      case 'danger':
        return 'danger';
      case 'outline':
        return 'primary';
      default:
        return 'primary';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'h-10 text-sm';
      case 'large':
        return 'h-14 text-lg';
      default:
        return 'h-12 text-base';
    }
  };

  return (
    <IonButton
      expand={fullWidth ? 'block' : undefined}
      fill={variant === 'outline' ? 'outline' : 'solid'}
      color={getColor()}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      className={`${getSizeClass()} min-h-touch font-medium`}
    >
      {loading ? <IonSpinner name="crescent" /> : children}
    </IonButton>
  );
};
