import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { SelectionControl, SelectionOption } from './SelectionControl';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);
it('searches Ionic options, keeps disabled choices unavailable and emits the existing event contract', () => {
  const change = vi.fn();
  render(
    <SelectionControl aria-label="Firm" value="1" onIonChange={change}>
      <SelectionOption value="1">First shop</SelectionOption>
      <SelectionOption value="2" disabled>
        Locked shop
      </SelectionOption>
      <SelectionOption value="3">Other shop</SelectionOption>
    </SelectionControl>
  );
  const input = screen.getByRole('combobox');
  fireEvent.focus(input);
  expect((screen.getByRole('button', { name: 'Locked shop' }) as HTMLButtonElement).disabled).toBe(
    true
  );
  fireEvent.change(input, { target: { value: 'Other' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(change.mock.calls[0][0].detail.value).toBe('3');
});
it('shows checkboxes for multiple selections and preserves the array contract', () => {
  const change = vi.fn();
  render(
    <SelectionControl aria-label="Roles" multiple value={['OWNER']} onIonChange={change}>
      <option value="OWNER">Owner</option>
      <option value="MANAGER">Manager</option>
    </SelectionControl>
  );
  fireEvent.focus(screen.getByRole('combobox'));
  expect(document.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Manager' }));
  expect(change.mock.calls[0][0].detail.value).toEqual(['OWNER', 'MANAGER']);
  expect(screen.getByRole('listbox')).toBeTruthy();
});

it('keeps uncommitted search invalid and skips disabled choices with the keyboard', () => {
  const change = vi.fn();
  render(
    <SelectionControl aria-label="Required choice" required value="" onIonChange={change}>
      <option value="">Choose</option>
      <option value="LOCKED" disabled>
        Locked
      </option>
      <option value="OK">Available</option>
    </SelectionControl>
  );
  const input = screen.getByRole('combobox') as HTMLInputElement;
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 'Available' } });
  expect(input.checkValidity()).toBe(false);
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(change).not.toHaveBeenCalled();
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(change.mock.calls[0][0].detail.value).toBe('OK');
});

it('reopens a closed menu when the selected input still has focus', () => {
  render(
    <SelectionControl aria-label="Choice" value="A">
      <option value="A">Alpha</option>
    </SelectionControl>
  );
  const input = screen.getByRole('combobox');
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.queryByRole('listbox')).toBeNull();
  fireEvent.click(input);
  expect(screen.getByRole('listbox')).toBeTruthy();
});

it('removes a portalled menu when Ionic hides its retained route', async () => {
  const { container } = render(
    <div className="ion-page">
      <SelectionControl aria-label="Route choice" value="A">
        <option value="A">Alpha</option>
      </SelectionControl>
    </div>
  );
  fireEvent.focus(screen.getByRole('combobox'));
  expect(screen.getByRole('listbox')).toBeTruthy();
  container.firstElementChild?.classList.add('ion-page-hidden');
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
});
