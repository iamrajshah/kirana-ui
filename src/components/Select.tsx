import React from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption } from '@ionic/react';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly Option[] | Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  error,
}) => {
  return (
    <div className="mb-4">
      <IonItem className={error ? 'ion-invalid' : ''} lines="none">
        <IonLabel position="stacked" className="text-base font-medium mb-2">
          {label} {required && <span className="text-danger">*</span>}
        </IonLabel>
        <IonSelect
          onIonChange={(e: CustomEvent) => onChange(e.detail.value)}
          placeholder={placeholder}
          disabled={disabled}
          interface="popover"
          className="text-base"
        >
          {options.map((option) => (
            <IonSelectOption key={option.value} value={option.value}>
              {option.label}
            </IonSelectOption>
          ))}
        </IonSelect>
      </IonItem>
      {error && <div className="text-danger text-sm mt-1 px-4">{error}</div>}
    </div>
  );
};
