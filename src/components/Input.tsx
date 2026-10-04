import React, { useState } from 'react';
import { IonInput } from '@ionic/react';
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
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={(e) => {
              e.stopPropagation();
              setShowPassword((isVisible) => !isVisible);
            }}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              cursor: 'pointer',
              zIndex: 10,
              padding: '4px',
              border: 0,
              background: 'transparent',
            }}
          >
            {/* IonIcon can retain its previous shadow-DOM SVG when its icon prop changes. */}
            <img
              src={showPassword ? eye : eyeOff}
              alt=""
              aria-hidden="true"
              style={{
                width: '22px',
                height: '22px',
                display: 'block',
                opacity: 0.55,
                pointerEvents: 'none',
              }}
            />
          </button>
        )}
      </div>
    </div>
  );
};
