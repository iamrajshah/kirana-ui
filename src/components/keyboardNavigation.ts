import { useEffect } from 'react';

/** One ordered list for Ionic hosts, native editors and searchable selections. */
function editableFields(scope: ParentNode): HTMLElement[] {
  return Array.from(
    scope.querySelectorAll<HTMLElement>(
      'ion-input,ion-searchbar,ion-select,input,select,textarea,[role="combobox"]'
    )
  ).filter(
    (node) =>
      !node.closest('[hidden],[aria-hidden="true"],.ion-page-hidden') &&
      !(node as HTMLInputElement).disabled &&
      !node.matches(
        ':disabled,[type="hidden"],[type="submit"],[type="button"],[type="checkbox"],[type="radio"],[type="file"]'
      ) &&
      !node.matches('ion-input input,ion-searchbar input') &&
      node.getClientRects().length > 0
  );
}

function focusField(field?: HTMLElement): void {
  if (!field) return;
  if ('setFocus' in field) void (field as unknown as HTMLIonInputElement).setFocus();
  else field.focus();
}

export function focusFirstEditable(container: HTMLElement): void {
  const active = document.activeElement;
  if (
    active instanceof HTMLElement &&
    container.contains(active) &&
    active.matches('input,textarea,[role="combobox"]')
  )
    return;
  focusField(editableFields(container)[0]);
}

export function focusNextEditable(source: HTMLElement): void {
  const scope = source.closest('form,ion-modal,ion-content');
  if (!scope) return;
  const fields = editableFields(scope);
  const next = fields[fields.indexOf(source) + 1];
  if (fields.indexOf(source) < 0 || !next) return;
  if ('setFocus' in next) void (next as unknown as HTMLIonInputElement).setFocus();
  else next.focus();
}

/** Dedicated autocomplete/scanner handlers run first; never submit a transaction. */
export function advanceOnEnter(
  event: React.KeyboardEvent<HTMLElement | HTMLIonInputElement> | KeyboardEvent
): void {
  const native = 'nativeEvent' in event ? event.nativeEvent : event;
  if (
    event.key !== 'Enter' ||
    event.defaultPrevented ||
    native.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;
  const target = event.target instanceof HTMLElement ? event.target : event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  const source = target.closest<HTMLElement>('ion-input') ?? target;
  if (
    source.closest('ion-searchbar') ||
    !source.matches('ion-input,input,select') ||
    source.matches(
      '[role="combobox"],[type="checkbox"],[type="radio"],[type="file"],[type="submit"],[type="button"],[type="search"]'
    )
  )
    return;
  const input =
    source instanceof HTMLInputElement
      ? source
      : (source.querySelector('input') ?? source.shadowRoot?.querySelector('input'));
  event.preventDefault();
  if (source.classList.contains('ion-invalid') || (input && !input.reportValidity())) return;
  focusNextEditable(source);
}

/** Covers native editors added by individual pages, including portalled modals. */
export function KeyboardNavigation(): null {
  useEffect(() => {
    document.addEventListener('keydown', advanceOnEnter);
    return () => document.removeEventListener('keydown', advanceOnEnter);
  }, []);
  return null;
}
