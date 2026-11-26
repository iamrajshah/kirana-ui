import React from 'react';
import { SearchableSelect } from './SearchableSelect';

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
    <>
      <SearchableSelect
        label={label}
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
      {error && (
        <div role="alert" className="text-danger text-sm mt-1">
          {error}
        </div>
      )}
    </>
  );
};
