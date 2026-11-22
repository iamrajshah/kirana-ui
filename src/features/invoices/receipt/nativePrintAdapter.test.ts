import { expect, it, vi } from 'vitest';
const print = vi.hoisted(() => vi.fn());
vi.mock('@capacitor/core', () => ({ registerPlugin: () => ({ printPdf: print }) }));
import { printNativePdf } from './nativePrintAdapter';
it('sends PDF bytes to the native print bridge', async () => {
  print.mockResolvedValueOnce({ completed: true });
  expect(await printNativePdf(new Blob(['%PDF-1.4 test']))).toBe(true);
  expect(atob(print.mock.calls[0][0].base64)).toBe('%PDF-1.4 test');
});
it('preserves cancellation from the system print sheet', async () => {
  print.mockResolvedValueOnce({ completed: false });
  expect(await printNativePdf(new Blob(['%PDF-1.4 test']))).toBe(false);
});
