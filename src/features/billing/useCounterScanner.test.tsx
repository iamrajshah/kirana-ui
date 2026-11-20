import { act, cleanup, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCounterScanner } from './useCounterScanner';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});
const scan = (code: string, suffix = 'Enter', target: Document | HTMLElement = document) => {
  for (const key of code) fireEvent.keyDown(target, { key });
  fireEvent.keyDown(target, { key: suffix });
};

describe('counter HID capture', () => {
  it('accepts 100 scans including intentional repeated codes without clicking', () => {
    const callback = vi.fn();
    renderHook(() => useCounterScanner(true, callback));
    act(() => {
      for (let i = 0; i < 100; i++) scan('8901234567890');
    });
    expect(callback).toHaveBeenCalledTimes(100);
    expect(callback).toHaveBeenLastCalledWith('8901234567890');
  });
  it('accepts a Tab suffix but keeps ordinary Tab navigation', () => {
    const callback = vi.fn();
    renderHook(() => useCounterScanner(true, callback));
    scan('ABC123', 'Tab');
    expect(callback).toHaveBeenCalledWith('ABC123');
    expect(fireEvent.keyDown(document, { key: 'Tab' })).toBe(true);
  });
  it('ignores slow typing and discards an incomplete burst', () => {
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const callback = vi.fn();
    renderHook(() => useCounterScanner(true, callback));
    for (const key of '123456') {
      fireEvent.keyDown(document, { key });
      now += 150;
    }
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(callback).not.toHaveBeenCalled();
    scan('NEW123');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('NEW123');
  });
  it('does not read quantity, customer or payment input, including shadow inputs', () => {
    const callback = vi.fn();
    renderHook(() => useCounterScanner(true, callback));
    const host = document.createElement('div');
    document.body.append(host);
    const input = document.createElement('input');
    host.attachShadow({ mode: 'open' }).append(input);
    scan('8901234567890', 'Enter', input);
    expect(callback).not.toHaveBeenCalled();
  });
  it('pauses for modal dialogs and discards a partial code when disabled', () => {
    const callback = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ enabled }) => useCounterScanner(enabled, callback),
      { initialProps: { enabled: true } }
    );
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.append(modal);
    scan('8901234567890');
    modal.remove();
    expect(callback).not.toHaveBeenCalled();
    scan('123', 'Shift');
    rerender({ enabled: false });
    scan('8901234567890');
    rerender({ enabled: true });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(callback).not.toHaveBeenCalled();
    scan('8901234567890');
    expect(callback).toHaveBeenCalledTimes(1);
    unmount();
    scan('8901234567890');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
