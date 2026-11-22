import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ native: true, platform: 'ios', printHtml: vi.fn() }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => state.native, getPlatform: () => state.platform },
  registerPlugin: () => ({ printHtml: state.printHtml }),
}));
import { printReport, reportPrintHtml } from './reportPrint';
afterEach(() => {
  vi.restoreAllMocks();
  state.native = true;
  state.platform = 'ios';
  state.printHtml.mockReset();
});
it('prints escaped multilingual report content through the iOS system preview', async () => {
  state.printHtml.mockResolvedValue({ completed: false });
  const web = vi.spyOn(window, 'print').mockImplementation(() => undefined);
  await printReport('GST & बिक्री', 'Total ₹500\n<script>unsafe</script>');
  expect(state.printHtml).toHaveBeenCalledWith({
    jobName: 'GST & बिक्री',
    html: reportPrintHtml('GST & बिक्री', 'Total ₹500\n<script>unsafe</script>'),
  });
  expect(state.printHtml.mock.calls[0][0].html).not.toContain('<script>');
  expect(web).not.toHaveBeenCalled();
});
it('keeps browser print for the web', async () => {
  state.native = false;
  state.platform = 'web';
  const web = vi.spyOn(window, 'print').mockImplementation(() => undefined);
  await printReport('Sales', 'Total ₹500');
  expect(web).toHaveBeenCalledOnce();
  expect(state.printHtml).not.toHaveBeenCalled();
});
it('propagates a native failure so the page can show feedback and re-enable printing', async () => {
  state.printHtml.mockRejectedValue(new Error('Unavailable'));
  await expect(printReport('Sales', 'Total')).rejects.toThrow('Unavailable');
});
