import { focusNextEditable } from './keyboardNavigation';
import React, { useId, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

type Props<T extends string | readonly string[]> = {
  label: string;
  hideLabel?: boolean;
  id?: string;
  name?: string;
  ariaLabelledBy?: string;
  multiple?: boolean;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  onSearch?: (query: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
};

export function SearchableSelect<T extends string | readonly string[]>({
  id: suppliedId,
  name,
  ariaLabelledBy,
  multiple,
  label,
  hideLabel,
  value,
  onChange,
  options,
  onSearch,
  onCreate,
  createLabel,
  disabled,
  required,
  placeholder,
}: Props<T>) {
  const { t } = useTranslation();
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  useEffect(() => {
    const input = inputRef.current;
    input?.setCustomValidity(
      required && (multiple ? !value.length : !value) ? t('customers.fillRequiredFields') : ''
    );
  }, [required, value, multiple, t]);
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const box = inputRef.current?.getBoundingClientRect();
      if (box)
        setPosition({
          top: Math.min(box.bottom, Math.max(0, window.innerHeight - 270)),
          left: box.left,
          width: box.width,
        });
    };
    update();
    const page = inputRef.current?.closest('ion-page,.ion-page');
    const observer = new MutationObserver(() => {
      if (
        page?.classList.contains('ion-page-hidden') ||
        page?.getAttribute('aria-hidden') === 'true'
      )
        setOpen(false);
    });
    if (page)
      observer.observe(page, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  useEffect(() => {
    if (open) document.getElementById(`${id}-${highlight}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [id, highlight, open]);
  const selectedCache = useRef<{ value: string; label: string }>();
  const selected =
    options.find((option) => option.value === value) ??
    (selectedCache.current?.value === value ? selectedCache.current : undefined);
  if (selected) selectedCache.current = selected;
  const results = options
    .filter((option) => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .slice(0, 20);
  const choose = (next: string) => {
    if (disabled || options.find((option) => option.value === next)?.disabled) return;
    selectedCache.current = options.find((option) => option.value === next);
    const nextValue = multiple
      ? Array.isArray(value) && value.includes(next)
        ? value.filter((item) => item !== next)
        : [...(Array.isArray(value) ? value : []), next]
      : next;
    onChange(nextValue as T);
    if (multiple) return;
    setOpen(false);
    setQuery('');
    onSearch?.('');
  };
  return (
    <div
      className="mb-4 relative"
      onBlur={(event) => {
        if (
          !event.currentTarget.contains(event.relatedTarget as Node | null) &&
          !document.getElementById(`${id}-popup`)?.contains(event.relatedTarget as Node | null)
        )
          setOpen(false);
      }}
    >
      {label && !hideLabel && (
        <label htmlFor={id} className="block mb-2 font-medium">
          {label}
          {required ? ' *' : ''}
        </label>
      )}
      <input
        ref={inputRef}
        required={required}
        id={id}
        name={name}
        aria-label={label || undefined}
        aria-labelledby={ariaLabelledBy}
        aria-required={required}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && results[highlight] ? `${id}-${highlight}` : undefined}
        disabled={disabled}
        autoComplete="off"
        placeholder={placeholder}
        value={
          open
            ? query
            : multiple
              ? options
                  .filter((option) => Array.isArray(value) && value.includes(option.value))
                  .map((option) => option.label)
                  .join(', ')
              : (selected?.label ?? '')
        }
        style={{
          background: 'var(--ion-item-background, var(--ion-background-color))',
          color: 'var(--ion-text-color)',
        }}
        className="w-full min-h-touch rounded-lg border border-gray-400 px-3"
        onClick={() => {
          if (!open) {
            setOpen(true);
            setQuery('');
            setHighlight(0);
            onSearch?.('');
          }
        }}
        onFocus={() => {
          setOpen(true);
          setQuery('');
          setHighlight(0);
          onSearch?.('');
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setHighlight(0);
          onSearch?.(event.target.value.trim());
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setHighlight((index) => {
              const direction = event.key === 'ArrowDown' ? 1 : -1;
              for (
                let next = index + direction;
                next >= 0 && next < results.length;
                next += direction
              ) {
                if (!results[next].disabled) return next;
              }
              return index;
            });
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (open && results[highlight] && !results[highlight].disabled) {
              choose(results[highlight].value);
              if (!multiple)
                requestAnimationFrame(() => {
                  if (inputRef.current) focusNextEditable(inputRef.current);
                });
            } else setOpen(true);
          }
          if (event.key === ' ' && !open) {
            event.preventDefault();
            setQuery('');
            setOpen(true);
          }
        }}
      />
      {open && (
        <small className="block mt-1" style={{ color: 'var(--ion-color-medium)' }}>
          {t('common.selectionShortcuts')}
        </small>
      )}
      {open &&
        createPortal(
          <div
            id={`${id}-popup`}
            data-selection-popup="true"
            onMouseDown={(event) => event.preventDefault()}
            className="rounded-lg border shadow-lg overflow-auto max-h-64"
            style={{
              position: 'fixed',
              zIndex: 100000,
              ...position,
              background: 'var(--ion-background-color, white)',
              color: 'var(--ion-text-color, black)',
            }}
          >
            {results.length === 0 && (
              <p role="status" className="px-3 py-3">
                {t('common.noData')}
              </p>
            )}
            <ul
              id={`${id}-list`}
              role="listbox"
              aria-label={label}
              aria-multiselectable={multiple || undefined}
            >
              {results.map((option, index) => (
                <li
                  key={option.value}
                  data-value={option.value}
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={
                    multiple
                      ? Array.isArray(value) && value.includes(option.value)
                      : value === option.value
                  }
                  aria-disabled={option.disabled}
                  tabIndex={-1}
                >
                  <button
                    type="button"
                    disabled={option.disabled}
                    tabIndex={-1}
                    className="w-full text-left px-3 py-3"
                    style={
                      highlight === index
                        ? {
                            background: 'var(--ion-color-primary)',
                            color: 'var(--ion-color-primary-contrast)',
                          }
                        : {}
                    }
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option.value)}
                  >
                    {multiple && (
                      <input
                        type="checkbox"
                        checked={Array.isArray(value) && value.includes(option.value)}
                        readOnly
                        tabIndex={-1}
                        aria-hidden="true"
                        className="mr-2"
                      />
                    )}
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
            {onCreate && (
              <button
                type="button"
                className="w-full text-left px-3 py-3 font-semibold"
                onClick={() => {
                  setOpen(false);
                  onCreate();
                }}
              >
                {createLabel ?? t('common.add')}
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
