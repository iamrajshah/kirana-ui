import React from 'react';
import { IonSearchbar } from '@ionic/react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounce?: number;
  onKeyDown?: React.KeyboardEventHandler<HTMLIonSearchbarElement>;
  activeDescendant?: string;
  controls?: string;
  expanded?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  debounce = 300,
  onKeyDown,
  activeDescendant,
  controls,
  expanded,
}) => (
  <IonSearchbar
    value={value}
    onIonInput={(e: CustomEvent) => onChange(e.detail.value ?? '')}
    placeholder={placeholder}
    debounce={debounce}
    onKeyDown={onKeyDown}
    aria-activedescendant={activeDescendant}
    aria-controls={controls}
    aria-expanded={expanded}
    className="p-0"
  />
);
