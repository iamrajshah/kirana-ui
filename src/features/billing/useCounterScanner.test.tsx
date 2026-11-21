import { act, cleanup, createEvent, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCounterScanner } from './useCounterScanner';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});
let clock = 1000;
const keydown = (target: Document | HTMLElement, key: string) => {
  const event = createEvent.keyDown(target, { key });
  Object.defineProperty(event, 'timeStamp', { value: clock++ });
  fireEvent(target, event);
};
const scan = (code: string, suffix = 'Enter', target: Document | HTMLElement = document) => {
  for (const key of code) keydown(target, key);
  keydown(target, suffix);
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
    const callback = vi.fn();
    renderHook(() => useCounterScanner(true, callback));
    for (const key of '123456') {
      keydown(document, key);
      clock += 150;
    }
    keydown(document, 'Enter');
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
  it('ignores retained hidden Ionic overlays but pauses when they become visible', () => {
    const callback = vi.fn();
    renderHook(() => useCounterScanner(true, callback));
    const wrapper = document.createElement('ion-loading');
    wrapper.className = 'overlay-hidden';
    wrapper.innerHTML = '<div role="dialog" aria-modal="true"></div>';
    document.body.append(wrapper);
    scan('8901234567890');
    wrapper.classList.remove('overlay-hidden');
    wrapper.style.display = 'none';
    scan('8901234567890');
    wrapper.style.display = '';
    scan('8901234567890');
    expect(callback).toHaveBeenCalledTimes(2);
    wrapper.hidden = true;
    scan('8901234567890');
    expect(callback).toHaveBeenCalledTimes(3);
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
    keydown(document, 'Enter');
    expect(callback).not.toHaveBeenCalled();
    scan('8901234567890');
    expect(callback).toHaveBeenCalledTimes(1);
    unmount();
    scan('8901234567890');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
