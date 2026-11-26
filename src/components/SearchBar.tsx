import React from 'react';
import { IonSearchbar } from '@ionic/react';

interface SearchBarProps {
  searchRef?: React.Ref<HTMLIonSearchbarElement>;
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
  searchRef,
  onChange,
  placeholder = 'Search...',
  debounce = 300,
  onKeyDown,
  activeDescendant,
  controls,
  expanded,
}) => (
  <div
    onKeyDownCapture={(event) =>
      onKeyDown?.(event as unknown as React.KeyboardEvent<HTMLIonSearchbarElement>)
    }
  >
    <IonSearchbar
      ref={searchRef}
      value={value}
      onIonInput={(e: CustomEvent) => onChange(e.detail.value ?? '')}
      placeholder={placeholder}
      debounce={debounce}
      aria-activedescendant={activeDescendant}
      aria-controls={controls}
      aria-expanded={expanded}
      className="p-0"
    />
  </div>
);
