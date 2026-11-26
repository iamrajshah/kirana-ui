import React from 'react';
import { SearchableSelect } from './SearchableSelect';

type BaseProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  'value' | 'onChange' | 'multiple'
> & {
  value?: string | number | readonly string[];
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  interface?: string;
  interfaceOptions?: { header?: string; [key: string]: unknown };
  placeholder?: string;
  label?: string;
  labelPlacement?: string;
};
type Props = BaseProps &
  (
    | { multiple?: false; onIonChange?: (event: CustomEvent<{ value: string }>) => void }
    | { multiple: true; onIonChange?: (event: CustomEvent<{ value: string[] }>) => void }
  );
export const SelectionOption = (props: React.OptionHTMLAttributes<HTMLOptionElement>) => (
  <option {...props} />
);
function textOf(node: React.ReactNode): string {
  return React.Children.toArray(node)
    .map((child) =>
      React.isValidElement<{ children?: React.ReactNode }>(child)
        ? textOf(child.props.children)
        : String(child)
    )
    .join('');
}
export function SelectionControl({
  children,
  value,
  onChange,
  onIonChange,
  multiple,
  disabled,
  required,
  placeholder,
  label,
  interfaceOptions,
  className,
  style,
  id,
  name,
  'aria-label': ariaLabel,
  ...rest
}: Props) {
  const options: { value: string; label: string; disabled?: boolean }[] = [];
  const collect = (nodes: React.ReactNode, groupDisabled = false) => {
    React.Children.forEach(nodes, (child) => {
      if (
        !React.isValidElement<{
          value?: string | number;
          children?: React.ReactNode;
          disabled?: boolean;
        }>(child)
      )
        return;
      if (child.type === React.Fragment || child.type === 'optgroup')
        collect(child.props.children, groupDisabled || child.props.disabled);
      else
        options.push({
          value: String(child.props.value ?? textOf(child.props.children)),
          label: textOf(child.props.children),
          disabled: groupDisabled || child.props.disabled,
        });
    });
  };
  collect(children);
  return (
    <div className={className} style={{ minWidth: 0, width: '100%', ...style }}>
      <SearchableSelect
        id={id}
        name={name}
        hideLabel={!label}
        label={label ?? ariaLabel ?? interfaceOptions?.header ?? placeholder ?? ''}
        value={multiple ? (Array.isArray(value) ? value : []) : String(value ?? '')}
        multiple={multiple}
        options={options}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        onChange={(next) => {
          (
            onIonChange as
              | ((event: CustomEvent<{ value: string | readonly string[] }>) => void)
              | undefined
          )?.(new CustomEvent('ionChange', { detail: { value: next } }));
          onChange?.({
            target: { value: next, name },
            currentTarget: { value: next, name },
          } as React.ChangeEvent<HTMLSelectElement>);
        }}
        ariaLabelledBy={rest['aria-labelledby']}
      />
    </div>
  );
}
