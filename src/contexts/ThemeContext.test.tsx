import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ThemeProvider } from './ThemeContext';
import { useTheme } from './useTheme';
const native = vi.hoisted(() => ({ enabled: false, setStyle: vi.fn(async () => undefined) }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.enabled } }));
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: { setStyle: native.setStyle },
  Style: { Dark: 'DARK', Light: 'LIGHT' },
}));
beforeEach(() => {
  localStorage.clear();
  native.enabled = false;
  native.setStyle.mockClear();
});
afterEach(cleanup);
const Toggle = () => {
  const { toggleTheme } = useTheme();
  return <button onClick={toggleTheme}>Change theme</button>;
};
it('keeps native status-bar text readable when the application theme changes', () => {
  native.enabled = true;
  render(
    <ThemeProvider>
      <Toggle />
    </ThemeProvider>
  );
  expect(native.setStyle).toHaveBeenLastCalledWith({ style: 'DARK' });
  fireEvent.click(screen.getByText('Change theme'));
  expect(native.setStyle).toHaveBeenLastCalledWith({ style: 'LIGHT' });
});
it('does not call native status-bar APIs in a browser', () => {
  render(
    <ThemeProvider>
      <Toggle />
    </ThemeProvider>
  );
  fireEvent.click(screen.getByText('Change theme'));
  expect(native.setStyle).not.toHaveBeenCalled();
});
