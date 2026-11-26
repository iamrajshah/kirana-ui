/** Advance only through editable fields; never activate a submit/payment button. */
export function advanceOnEnter(
  event: React.KeyboardEvent<HTMLElement | HTMLIonInputElement>
): void {
  if (
    event.key !== 'Enter' ||
    event.defaultPrevented ||
    event.nativeEvent.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;
  const source = event.currentTarget as unknown as HTMLElement;
  if (source.matches('textarea,[role="combobox"]')) return;
  const input =
    source instanceof HTMLInputElement
      ? source
      : (source.querySelector('input') ?? source.shadowRoot?.querySelector('input'));
  event.preventDefault();
  if (source.classList.contains('ion-invalid') || (input && !input.reportValidity())) return;
  const scope = source.closest('form,ion-modal,ion-content');
  if (!scope) return;
  const fields = Array.from(
    scope.querySelectorAll<HTMLElement>(
      'ion-input,ion-select,input,select,textarea,[role="combobox"]'
    )
  ).filter(
    (node) =>
      !node.closest('[hidden],[aria-hidden="true"],.ion-page-hidden') &&
      !node.matches('[disabled],[type="hidden"]') &&
      !node.matches('ion-input input') &&
      node.getClientRects().length > 0
  );
  const index = fields.indexOf(source);
  const next = index >= 0 ? fields[index + 1] : undefined;
  if (!next) return;
  if ('setFocus' in next) void (next as unknown as HTMLIonInputElement).setFocus();
  else next.focus();
}
