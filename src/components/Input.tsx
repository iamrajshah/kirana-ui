import React from 'react';
import { IonInput } from '@ionic/react';

interface InputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  maxLength,
}) => {
  return (
    <div className="mb-4">
      <IonInput
        label={label}
        labelPlacement="stacked"
        onIonInput={(e: CustomEvent) => onChange(e.detail.value ?? '')}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        maxlength={maxLength}
        className={`text-base ${error ? 'ion-invalid' : ''}`}
        errorText={error}
      />
    </div>
  );
};
