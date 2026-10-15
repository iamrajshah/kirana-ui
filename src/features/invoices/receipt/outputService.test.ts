// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { createReceiptOutputService } from './outputService';
import type { ReceiptViewModel } from './types';

const receipt = {
  invoiceId: '42',
  invoiceNumber: 'INV-42',
  title: 'Receipt',
  supplier: { name: 'Rajesh Kirana' },
} as ReceiptViewModel;
const pdf = new Blob(['pdf'], { type: 'application/pdf' });

describe('receipt output service', () => {
  it('selects the requested thermal width only for the active print job', async () => {
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const service = createReceiptOutputService();

    await service.run('print', receipt, '58mm');

    expect(document.documentElement.dataset.receiptPaper).toBe('58mm');
    expect(window.print).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('afterprint'));
    expect(document.documentElement.dataset.receiptPaper).toBeUndefined();
  });

  it('shares one PDF file when web file sharing is supported', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const download = vi.fn();
    const service = createReceiptOutputService({
      createPdf: vi.fn().mockResolvedValue(pdf),
      download,
      webShare: { canShare: () => true, share },
      isNative: () => false,
    });

    await service.run('share', receipt);

    expect(service.getState()).toMatchObject({ phase: 'completed' });
    expect(share).toHaveBeenCalledOnce();
    expect(share.mock.calls[0][0].files).toHaveLength(1);
    expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File);
    expect(download).not.toHaveBeenCalled();
    expect(service.getState()).toMatchObject({ phase: 'completed', action: 'share' });
  });

  it.each(['unsupported', 'cancelled'] as const)(
    'downloads the generated PDF when sharing is %s without reporting a sale failure',
    async (caseName) => {
      const share = vi.fn();
      if (caseName === 'cancelled') {
        share.mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
      }
      const download = vi.fn();
      const service = createReceiptOutputService({
        createPdf: vi.fn().mockResolvedValue(pdf),
        download,
        webShare: { canShare: () => caseName !== 'unsupported', share },
        isNative: () => false,
      });

      await service.run('share', receipt);

      expect(download).toHaveBeenCalledWith(pdf, 'INV-42.pdf');
      expect(service.getState()).toMatchObject({
        phase: caseName === 'cancelled' ? 'cancelled' : 'completed',
        action: 'share',
        fallbackDownloaded: true,
      });
    }
  );

  it('blocks duplicate activation while PDF generation is pending', async () => {
    let finish!: (value: Blob) => void;
    const createPdf = vi.fn(() => new Promise<Blob>((resolve) => (finish = resolve)));
    const service = createReceiptOutputService({
      createPdf,
      download: vi.fn(),
      webShare: { canShare: () => false, share: vi.fn() },
      isNative: () => false,
    });

    const first = service.run('pdf', receipt);
    const second = service.run('pdf', receipt);

    expect(service.getState()).toMatchObject({ phase: 'generating', action: 'pdf' });
    expect(createPdf).toHaveBeenCalledOnce();
    await expect(second).resolves.toMatchObject({ phase: 'generating' });
    finish(pdf);
    await first;
    expect(service.getState()).toMatchObject({ phase: 'completed', action: 'pdf' });
  });
});
