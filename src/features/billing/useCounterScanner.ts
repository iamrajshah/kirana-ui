import { useEffect, useRef } from 'react';

// Ionic retains dismissed overlay wrappers in the DOM. Only a visible overlay
// should suspend counter capture, including when its wrapper is hidden.
const hasActiveOverlay = (): boolean =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="dialog"][aria-modal="true"],ion-modal.show-modal,ion-alert.overlay-presented,ion-action-sheet.overlay-presented,ion-loading.overlay-presented'
    )
  ).some((overlay) => {
    for (let node: HTMLElement | null = overlay; node; node = node.parentElement) {
      if (
        node.hidden ||
        node.getAttribute('aria-hidden') === 'true' ||
        node.classList.contains('overlay-hidden')
      )
        return false;
      const style = getComputedStyle(node);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse'
      )
        return false;
    }
    return true;
  });

// USB/Bluetooth scanners in keyboard (HID) mode send a burst followed by Enter
// or Tab. Never intercept ordinary typing, form editing or another page.
export const useCounterScanner = (enabled: boolean, onScan: (code: string) => void) => {
  const callback = useRef(onScan);
  callback.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    let buffer = '';
    let lastKeyAt = 0;
    const reset = () => {
      buffer = '';
      lastKeyAt = 0;
    };
    const keydown = (event: KeyboardEvent) => {
      const editing = event
        .composedPath()
        .some(
          (node) =>
            node instanceof HTMLElement &&
            (node.matches(
              'input,textarea,select,[contenteditable]:not([contenteditable="false"])'
            ) ||
              node.isContentEditable)
        );
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        editing ||
        document.visibilityState === 'hidden' ||
        hasActiveOverlay()
      ) {
        reset();
        return;
      }
      // Use event creation time so a busy render cannot split a queued HID burst.
      const now = event.timeStamp;
      if (now - lastKeyAt > 80) buffer = '';
      if (event.key === 'Enter' || event.key === 'Tab') {
        const code = buffer;
        reset();
        if (code.length >= 4) {
          event.preventDefault();
          event.stopPropagation();
          callback.current(code);
        }
        return;
      }
      if (event.key.length !== 1 || event.repeat) {
        reset();
        return;
      }
      buffer += event.key;
      lastKeyAt = now;
      if (buffer.length > 128) reset();
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('visibilitychange', reset);
    document.addEventListener('focusin', reset);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('visibilitychange', reset);
      document.removeEventListener('focusin', reset);
    };
  }, [enabled]);
};
