import React, { useState } from 'react';
import { IonInput } from '@ionic/react';
import { eye, eyeOff } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';

interface InputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'number' | 'password' | 'date';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  maxLength?: number;
  min?: number;
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal';
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
  min,
  inputMode,
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : type;
  const visibleLabel = required && !label.trim().endsWith('*') ? `${label} *` : label;

  return (
    <div className="mb-4">
      <div className="relative">
        <IonInput
          label={visibleLabel}
          labelPlacement="stacked"
          value={value}
          onIonInput={(e: CustomEvent) => onChange(e.detail.value ?? '')}
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          maxlength={maxLength}
          min={min}
          inputmode={inputMode}
          required={required}
          className={`text-base ${error ? 'ion-invalid' : ''} ${isPasswordField ? 'pr-12' : ''}`}
          errorText={error}
        />
        {isPasswordField && (
          <button
            type="button"
            className="password-visibility-toggle"
            aria-label={showPassword ? t('common.hidePassword') : t('common.showPassword')}
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
