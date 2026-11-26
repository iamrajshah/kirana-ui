import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { advanceOnEnter } from './keyboardNavigation';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('moves to the next editable field, skips disabled inputs, and never submits payment', () => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    { width: 100 },
  ] as unknown as DOMRectList);
  const pay = vi.fn();
  render(
    <form onSubmit={pay}>
      <input aria-label="Name" onKeyDown={advanceOnEnter} />
      <input disabled />
      <input aria-label="Price" onKeyDown={advanceOnEnter} />
      <button type="submit">Pay</button>
    </form>
  );
  fireEvent.keyDown(screen.getByLabelText('Name'), { key: 'Enter' });
  expect(document.activeElement).toBe(screen.getByLabelText('Price'));
  fireEvent.keyDown(screen.getByLabelText('Price'), { key: 'Enter' });
  expect(pay).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(screen.getByLabelText('Price'));
});
it('keeps invalid fields focused and ignores composition and modifier keys', () => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    { width: 100 },
  ] as unknown as DOMRectList);
  render(
    <form>
      <input aria-label="Quantity" required onKeyDown={advanceOnEnter} />
      <input aria-label="Next" />
    </form>
  );
  const field = screen.getByLabelText('Quantity');
  field.focus();
  fireEvent.keyDown(field, { key: 'Enter' });
  expect(document.activeElement).toBe(field);
  fireEvent.keyDown(field, { key: 'Enter', isComposing: true });
  expect(document.activeElement).toBe(field);
});

it('uses Ionic disabled properties rather than the presence of disabled="false"', () => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    { width: 100 },
  ] as unknown as DOMRectList);
  const form = document.createElement('form');
  const first = document.createElement('ion-input');
  const disabled = document.createElement('ion-input');
  const next = document.createElement('ion-input');
  for (const host of [first, disabled, next]) {
    host.setAttribute('disabled', 'false');
    Object.assign(host, { disabled: false });
    host.append(document.createElement('input'));
    form.append(host);
  }
  Object.assign(disabled, { disabled: true });
  const focus = vi.fn();
  Object.assign(next, { setFocus: focus });
  document.body.append(form);
  const submit = vi.fn();
  form.addEventListener('submit', submit);
  first.addEventListener('keydown', (event) =>
    advanceOnEnter({
      key: event.key,
      defaultPrevented: event.defaultPrevented,
      nativeEvent: event,
      currentTarget: first,
      preventDefault: () => event.preventDefault(),
    } as unknown as React.KeyboardEvent<HTMLElement>)
  );
  fireEvent.keyDown(first.querySelector('input')!, { key: 'Enter' });
  expect(focus).toHaveBeenCalledOnce();
  expect(submit).not.toHaveBeenCalled();
  form.remove();
});
