import React from 'react';
import { IonSearchbar } from '@ionic/react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  debounce = 300,
}) => {
  return (
    <IonSearchbar
      onIonInput={(e: CustomEvent) => onChange(e.detail.value ?? '')}
      placeholder={placeholder}
      debounce={debounce}
      className="p-0"
    />
  );
};
