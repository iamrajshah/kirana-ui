import { fireEvent } from '@testing-library/react';
export function selectTestChoice(control: HTMLElement, value: string): void {
  if (control.tagName === 'SELECT') {
    fireEvent.change(control, { target: { value } });
    return;
  }
  fireEvent.focus(control);
  const listId = control.getAttribute('aria-controls');
  const option = Array.from(
    document.getElementById(listId ?? '')?.querySelectorAll('[data-value]') ?? []
  ).find((node) => node.getAttribute('data-value') === value);
  const button = option?.querySelector('button');
  if (!button) throw new Error(`Selection option ${value} was not found`);
  fireEvent.click(button);
}
