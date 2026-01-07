import React, { useState } from 'react';
import { IonInput, IonIcon } from '@ionic/react';
import { eye, eyeOff } from 'ionicons/icons';

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
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : type;

  return (
    <div className="mb-4">
      <div className="relative">
        <IonInput
          label={label}
          labelPlacement="stacked"
          value={value}
          onIonInput={(e: CustomEvent) => onChange(e.detail.value ?? '')}
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          maxlength={maxLength}
          className={`text-base ${error ? 'ion-invalid' : ''} ${isPasswordField ? 'pr-12' : ''}`}
          errorText={error}
        />
        {isPasswordField && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPassword(!showPassword);
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              zIndex: 10,
              padding: '4px',
            }}
          >
            <IonIcon
              icon={showPassword ? eyeOff : eye}
              style={{ 
                fontSize: '22px',
                color: '#666',
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
